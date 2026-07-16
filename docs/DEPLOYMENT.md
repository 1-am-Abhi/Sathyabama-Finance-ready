# Deployment Guide (Render)

The app deploys as **two Render web services** plus a managed **PostgreSQL** and
**Redis**, described declaratively in `render.yaml` (Render Blueprint).

## Services

| Service | rootDir | Build | Start | Health |
|---|---|---|---|---|
| `finance-api` (backend) | `finance-backend` | `npm ci` | `npm run migrate && npm start` | `/api/health` |
| `finance-frontend` | `finance-frontend` | `npm ci && npm run build` | `node server.js` (serves the optimized build) | `/` |

> **Note (fixed):** the frontend now starts with `node server.js` (Express serving
> the CRA production build) instead of `npm start` (the CRA dev server), and the
> backend lockfile is committed so `npm ci` succeeds.

## Prerequisites

1. A Render account and a GitHub repo connection.
2. A **PostgreSQL** instance (Render Managed Postgres). Copy its **Internal
   Connection String** into `DATABASE_URL`.
3. A **Redis** instance (required in production for Socket.IO scaling and the
   BullMQ disbursement worker). Copy its URL into `REDIS_URL` (use `rediss://` for
   TLS).

## First deploy

1. Push the repo to GitHub.
2. In Render, **New → Blueprint**, point at the repo. Render reads `render.yaml`
   and creates both services.
3. Set the `sync: false` secrets in the dashboard for each service:
   - Backend: `DATABASE_URL`, `REDIS_URL`, `ANTHROPIC_API_KEY` (`JWT_SECRET` is
     auto-generated).
   - Frontend: `REACT_APP_GOOGLE_API_KEY` (and confirm `REACT_APP_API_URL` points
     at the backend URL **with** the `/api` suffix).
4. Deploy. On boot the backend runs `npm run migrate` (applies
   `finance-backend/migrations/`), seeds default accounts + users, and starts the
   worker + cron jobs.

## Migrations

- Migrations in `finance-backend/migrations/` run automatically on every deploy.
- The hardening migrations in `finance-backend/migrations-review/` are **NOT**
  auto-run — review them, apply to staging first, then move approved ones into
  `migrations/` (see that folder's README).
- Roll back the last migration: `npx sequelize-cli db:migrate:undo`.

## Post-deploy verification checklist

1. `GET /api/health` → `{ status: "OK", db: "connected", redis: "connected" }`.
2. Log in as each role; confirm the correct dashboard loads.
3. **Disbursement smoke test (staging):** submit a fund request → approve →
   disburse → confirm a `Disbursement` row is created, the ledger balances
   (`GET /finance/statements/trial-balance`), and the faculty receives a
   real-time notification. This exercises the BullMQ worker that was previously
   never started.
4. **Real-time:** with a finance user connected, perform a disbursement from
   another session and confirm the finance dashboard updates without refresh.
5. **Rollback:** reverse a test disbursement and confirm the budget reopens and
   the ledger posts a balanced reversal (no immutability errors).
6. **AI:** call `POST /api/ai/proposal` with a topic; expect a draft (or 503 if
   `ANTHROPIC_API_KEY` is unset).
7. **Proof-gating:** attempt a 2nd installment before verifying the 1st; expect a
   409 `PREVIOUS_INSTALLMENT_UNVERIFIED`.

## Scaling notes

- The BullMQ disbursement worker currently runs **in the API process**. For higher
  throughput, extract it into a dedicated Render **Background Worker** service
  (`node -e "require('./src/workers/disbursementWorker')"` with the same env) and
  remove the in-process `require` from `server.js`.
- Redis is mandatory in production; Socket.IO uses the Redis adapter for
  multi-instance fan-out.

## Security headers & CORS

- `helmet` sets security headers; `x-powered-by` disabled; `trust proxy` enabled.
- CORS is locked to `FRONTEND_URL`. Keep it accurate when the frontend URL changes.
