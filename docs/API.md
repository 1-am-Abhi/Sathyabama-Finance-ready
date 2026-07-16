# API Documentation

Base URL: `${REACT_APP_API_URL}` → e.g. `https://finance-api-x1ig.onrender.com/api`.
Every route is available under both `/api/...` and `/api/v1/...`.

**Auth:** send `Authorization: Bearer <JWT>` (obtained from `POST /auth/login`).
Roles: `ADMIN`, `FACULTY`, `FINANCE_OFFICER`, `AUDITOR`.

**Response envelope:** `{ "success": boolean, "message"?: string, "data"?: any, "code"?: string }`.

---

## Health & System

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` , `/health` , `/api/health` | none | Liveness + DB/Redis status |
| GET | `/api/status` | none | System/alert status |
| GET | `/metrics` | none | Prometheus metrics |

## Auth (`/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | none | Login → `{ token, user }` |
| POST | `/auth/register` | none | Register a user |
| GET | `/auth/me` | any | Current user |
| GET | `/auth/users` | any | List users |
| PUT | `/auth/users/:id` | ADMIN | Update a user |
| DELETE | `/auth/users/:id` | ADMIN | Delete a user (not privileged accounts) |
| PUT | `/auth/users/:id/reset-password` | ADMIN | **New** — admin resets a faculty password (hashed, audit-logged) |
| PUT | `/auth/update-password` | any | Self-service password change |
| GET/POST | `/auth/centres` | any / ADMIN | List / add research centres |

## Projects (`/projects`)

Faculty create via the faculty portal; admin/finance read. See `projectRoutes.js`.

## Fund Requests / Installments (`/fund-requests`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/fund-requests` | any (faculty scoped to own) | List requests |
| GET | `/fund-requests/:id` | any (**faculty: own only**) | Single request |
| GET | `/fund-requests/project/:projectId` | any | Project budget + installments |
| GET | `/fund-requests/:requestId/audit` | any | Audit timeline |
| POST | `/fund-requests` | FACULTY | Create request (**gated: installment N>1 blocked until prev verified**) |
| PUT | `/fund-requests/:id` | FACULTY | Update documents/stage |
| PATCH/PUT | `/fund-requests/:id/approve` | ADMIN | Approve (transactional, audit-logged) |
| PATCH/PUT | `/fund-requests/:id/reject` | ADMIN | Reject |
| PATCH | `/fund-requests/:id/disburse` | FINANCE_OFFICER | Disburse (enqueues to worker) |
| POST | `/fund-requests/:id/disburse` | ADMIN, FINANCE_OFFICER | Disburse with proof upload |
| POST | `/fund-requests/:id/advance` | FACULTY, FINANCE_OFFICER, ADMIN | Advance pipeline stage |
| POST | `/fund-requests/:id/proofs` | FACULTY | **New** — upload bills/invoices/UC (→ `BILLS_UPLOADED`) |
| POST | `/fund-requests/:id/verify-utilization` | FINANCE_OFFICER, ADMIN | **New** — verify proofs (→ `UTILIZATION_COMPLETED`; 400 if incomplete) |
| POST | `/fund-requests/:id/return-for-correction` | FINANCE_OFFICER, ADMIN | **New** — bounce proofs back with remarks |

Proof upload body (multipart): `proof` (file), `proofType` ∈ `BILL|INVOICE|UTILIZATION_CERTIFICATE|SUPPORTING`.

## Finance (`/finance`)

Key endpoints (all auth, mostly FINANCE_OFFICER/ADMIN — see `financeRoutes.js`):

| Method | Path | Description |
|---|---|---|
| GET | `/finance/stats` , `/finance/dashboard` | Finance dashboards |
| GET | `/finance/fund-flow` , `/finance/fund-sources/overview` | Fund flow / sources |
| GET | `/finance/disbursements` , `/finance/disbursal-history` | Disbursements |
| POST | `/finance/disbursements/:id/rollback` | ADMIN — **fixed** hash-safe reversal |
| PUT | `/finance/disbursements/:id/execute` | Execute a disbursement |
| GET | `/finance/statements/{trial-balance,profit-loss,balance-sheet}` | Financial statements |
| GET | `/finance/ledger/verify` , POST `/finance/ledger/snapshot` | Ledger integrity + snapshots |
| GET/POST | `/finance/pfms` | PFMS transactions |
| GET | `/finance/financial-reports` , `/finance/financial-reports/{export,pdf}` | Reports |

## Faculty Portal (`/faculty`)

Faculty-scoped CRUD: `/faculty/projects`, `/faculty/fund-requests`,
`/faculty/event-requests`, `/faculty/od-requests`, `/faculty/documents`,
`/faculty/equipment-requests`, `/faculty/profile/update`. See `facultyPortalRoutes.js`.

## Events / OD / Equipment

| Area | Base | Notes |
|---|---|---|
| Events | `/event-requests` | create (FACULTY/ADMIN), `PUT /:id/status` (ADMIN), `PUT /:id/members` |
| OD | `/od-requests` | create (FACULTY), `PUT /:id/status` (**ownership-guarded for faculty**) |
| Equipment | `/equipment-requests` | create, `PUT /:id/status` |

## Documents & Uploads

| Method | Path | Description |
|---|---|---|
| GET/POST/PUT | `/documents`, `/documents/:id`, `/documents/:id/status` | Document CRUD + verification |
| POST | `/faculty-upload/preview`, `/faculty-upload/upload-final` | Bulk faculty import (Excel) |

## Analytics (`/analytics`)

`GET /analytics/{insights,advanced,alerts,faculty,top-projects,forecast-base,centre/:name}`.

## Notifications (`/notifications`)

List / mark-read notifications for the current user; also pushed via Socket.IO
(`notification`, `notifications:update`).

## AI (`/ai`) — **New**

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/ai/proposal` | any (rate-limited 20/min) | Body `{ topic }` → `{ data: { text } }` research proposal draft |
| POST | `/ai/analyze` | any (rate-limited 20/min) | Body `{ task, context }` → `{ data: { text, points[] } }` analysis |

Returns `503 { code: "AI_UNAVAILABLE" }` if `ANTHROPIC_API_KEY` is not set.

## Reports (`/report`)

Server-generated PDF/Excel exports for dashboards.

---

## Socket.IO

Connect with `auth: { token: <JWT> }`. Server auto-joins the user's id room and,
for FINANCE_OFFICER/ADMIN, the `finance` room.

| Event (server → client) | Payload | Meaning |
|---|---|---|
| `finance:update` | `{ type, ...ids, timestamp }` | Any finance action (disbursement, approval, reversal, proofs) |
| `notification` | notification object | New notification for the user |
| `notifications:update` | `{ userId, notificationId }` | Notification list changed |

| Event (client → server) | Meaning |
|---|---|
| `join <id>` | Join a specific room |
| `join-finance` | Join the finance broadcast room |
