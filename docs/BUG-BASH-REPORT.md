# Bug Bash Report

**Method:** every fix below was reproduced and verified against a **real running
stack** — a local PostgreSQL 16 database migrated with the full production
migration set, the backend running (`NODE_ENV=development`, disbursements
execute synchronously), driven through the REST API with real JWTs for
admin/faculty/finance, plus a real `socket.io-client` for live-sync. Nothing is
claimed fixed unless it was observed working.

> Testing note: Redis/BullMQ isn't exercised locally (dev mode runs the
> disbursement pipeline synchronously via the in-process shim). The production
> BullMQ worker runs the **same** `executeDisbursementPipeline`, so the logic is
> covered, but the queue transport itself still warrants one staging smoke-test.

---

## Summary

The root cause behind most "Internal Server Error" and broken-workflow reports
was a **dual `id`/`_id` primary-key divergence**: models declare `id`, but the
DB tables also carry an independent `_id` column whose default generates a
*different* UUID for rows created after the UUID-hardening migration. The API and
foreign keys use `id`; many lookups and two FKs used `_id`. That single disease
produced project/fund-request "not found", disbursement FK failures, and more.
Two other classes: **model↔table field mismatches** (Documents/PFMS PK, phantom
`organizationId`) and **frontend/response-shape mismatches** (`.data.users`, fund
source key).

**Final state:** every backend GET/POST across the three portals returns a valid
response (the only non-2xx are intentional role 403s), the full
installment/event/OD workflows complete, the ledger balances, notifications
generate, and live sync delivers socket events. The frontend build compiles
clean.

---

## Bugs fixed

### 1. Document Verification page — Internal Server Error (reported #10)
- **File(s):** `finance-backend/src/models/Document.js`, `src/controllers/documentController.js`
- **Root cause:** the `Documents` table's PK is `_id` and it has no
  `organizationId` column, but the model declared PK `id` + an `organizationId`
  field, and `getDocuments` filtered on `organizationId`. Every query failed with
  `column "id" does not exist`.
- **Fix:** model PK → `_id` (+ virtual `id` for back-compat), removed the phantom
  `organizationId`; dropped the org filter (faculty stay scoped by `facultyId`).
- **Verified:** `GET /documents` (admin) → **200** (was 500).

### 2. Faculty Documents API fails (reported #5)
- Same root cause/fix as #1. **Verified:** `GET /faculty/documents` → **200**;
  `POST /faculty/documents` → **201**.

### 3. PFMS module — Internal Server Error (reported #9)
- **File(s):** `src/models/PFMSTransaction.js`, `src/controllers/financeController.js`
- **Root cause:** identical PK/`organizationId` mismatch (`column
  PFMSTransaction.id does not exist`).
- **Fix:** model PK → `_id` (+ virtual `id`), removed phantom `organizationId`,
  dropped the org filter in `getPFMSTransactionsController`.
- **Verified:** `GET /finance/pfms` → **200** (was 500).

### 4. Settlement page cannot load financial data (reported #8)
- **Root cause:** the Settlement view (`/finance/reports` → FinanceDashboard)
  fans out to several finance endpoints including `/finance/pfms`, which 500'd
  (#3), failing the whole page.
- **Fix:** resolved by #3. **Verified:** every endpoint the finance dashboard
  calls now returns 200.

### 5. Project approval "Project not found" (reported #7)
- **File(s):** `src/controllers/projectController.js`, `src/controllers/fundRequestController.js`
- **Root cause:** id/_id divergence — the API exposes `id`, but
  `updateProject`/`getProjectDetails`/`deleteProject` (and `/finance/projects/:id/status`,
  which reuses `updateProject`) looked up `where: { _id: <the id> }`, which fails
  for projects created after the hardening migration (`id != _id`) — hence
  "sometimes".
- **Fix:** match by **either** key (`projectIdMatch` / `idMatch`).
- **Verified:** created a project with `id != _id`, then `PUT /projects/:id` and
  `POST /finance/projects/:id/status` → **success** (was "Project not found").

### 6. Fund-request approve & disburse "Request not found"
- **File(s):** `src/utils/idMatch.js` (new), `src/controllers/fundRequestController.js`,
  `src/controllers/financeController.js`, `src/services/financePipelineService.js`
  (`byUuid` helper — 8 lookup sites), `src/workers/disbursementWorker.js`,
  `src/queues/disbursementQueue.js`
- **Root cause:** same id/_id divergence across every fund-request/project lookup
  in the disbursement path.
- **Fix:** shared `idMatch(id)` = match `id` OR `_id`, applied everywhere.
- **Verified:** approve → **200**, disburse → **202** (both were 404).

### 7. Disbursement fails with a foreign-key violation
- **File(s):** `finance-backend/migrations/20260717000000-repoint-uuid-fks-to-id.js` (new)
- **Root cause:** convergence migrations added FKs
  `fk_disbursements_fund_request_uuid`/`_project_uuid` and
  `fk_pfms_transactions_project_uuid` referencing `FundRequests("_id")` /
  `Projects("_id")`, but the app stores the model `id` in those columns — so every
  disbursement of a newer fund request failed FK validation.
- **Fix:** migration repoints those FKs to reference `id` (NOT VALID). The
  `Documents.facultyId → Users("_id")` FK was left as-is (correct — Users' UUID
  key really is `_id`).
- **Verified:** ran the migration on the local DB; disburse → **202**, a
  `Disbursement` row is created and the request reaches `COMPLETED`.

### 8. Finance dashboard amounts don't update after editing fund values (reported #1)
- **File(s):** `src/controllers/financeController.js` (`updateFundSourceAmount`)
- **Root cause:** the edit wrote to a **non-canonical** fund-source key
  (`normalizeFundSourceType(source) || source`, e.g. `"INSTITUTIONAL"`), while
  every reader uses `mapToFundSourceKey` (`"institutionalFunds"`). Edits landed on
  a phantom row nothing read — so the dashboard never changed, and disbursement's
  allocation check always saw `allocated = 0`.
- **Fix:** resolve + write the canonical key; accept the source from
  `source`/`fundSource`/`type` (the frontend sends it in `type`).
- **Verified:** `PUT /finance/funds/update` → allocation persists;
  `GET /finance/fund-sources/overview` shows `totalAllocated` and, after a
  disbursement, `totalUsed: 100000, remainingBalance: 900000`; `/finance/fund-flow`
  shows `totalOut: 100000`.

### 9. Fund-source "used" undercounted (over-allocation risk)
- **File(s):** `src/services/financePipelineService.js`
- **Root cause:** `getFundSourceAllocationState` raw SQL joined
  `p."_id" = d."projectId"`, but disbursements store the project's `id` — so for
  divergent projects the join returned nothing and "used" was undercounted.
- **Fix:** join on `(p."id" = d."projectId" OR p."_id" = d."projectId")`.
- **Verified:** allocation check reflects real usage; overview `totalUsed` correct.

### 10. Admin Event Requests page crashes on undefined filter (reported #6)
- **File(s):** `finance-frontend/src/pages/admin/EventRequests.jsx`
- **Root cause:** `/auth/users` returns `{ success, data }`, but the page did
  `setFaculties(usersRes.data.users)` — `users` is undefined, so `faculties` became
  `undefined` and the render `faculties.filter(f => f.status === 'Active')` threw
  "Cannot read properties of undefined (reading 'filter')".
- **Fix:** `setFaculties(usersRes.data.data || usersRes.data.users || [])` and
  guarded the adjacent `.data.data.map` with `|| []`.
- **Verified:** `/auth/users` shape confirmed; `faculties` is always an array; the
  frontend build compiles; event create + admin approve verified via API.

### 11. GET /academic-metrics — Internal Server Error (admin)
- **File(s):** `src/controllers/academicMetricController.js`
- **Root cause:** for admins, `facultyId = req.query.facultyId`; with no param it
  ran `findOne({ where: { facultyId: undefined } })` → Sequelize
  "WHERE parameter facultyId has invalid undefined value".
- **Fix:** admin without a facultyId returns all metrics for the cycle.
- **Verified:** `/academic-metrics` → **200** for both admin and faculty.

### 12. App could not run against a non-SSL / local Postgres
- **File(s):** `src/config/sequelizeOptions.js`
- **Root cause:** SSL was hardcoded on; a local/unencrypted Postgres threw "server
  does not support SSL connections".
- **Fix:** SSL now conditional (honours `DB_SSL`, disabled for localhost) — matches
  `config.js`. This is what unblocked local reproduction/verification.
- **Verified:** backend connects + seeds + serves against local Postgres.

---

## Workflows / systems verified working (reported #2, #3, #18–#23)

| Area | How verified | Result |
|---|---|---|
| **Installment workflow** (#21) | allocate → faculty create request → admin approve → finance disburse | ✅ 202 "Disbursement executed", status → COMPLETED, disbursement linked |
| **Ledger updates** (#20) | `GET /finance/statements/trial-balance` after disburse | ✅ balanced: Project Research Expense **debit 100000** / Institutional Bank **credit 100000** |
| **Notifications** (#3, #19) | notification counts before/after each step | ✅ admin +1 on create, faculty +2 on approve+disburse; `GET /notifications` returns them |
| **Live sync / sockets** (#2, #18) | `socket.io-client` connected as finance, auto-joined the finance room | ✅ received `finance:update` for both `APPROVAL` and `DISBURSEMENT` in real time |
| **Event workflow** (#22) | faculty create (`eventTitle`/`dates`) → admin approve (College Funded) | ✅ 201 → APPROVED (feeds the fund pipeline) |
| **OD workflow** (#23) | faculty create → admin list → admin approve | ✅ 201 → listed → APPROVED |
| **Every backend endpoint** (#4, #11, #16) | full sweep of all GET + key POST across admin/faculty/finance | ✅ all 200/201 except intentional role-403s |

---

## Files modified in the bug bash

Backend:
- `src/config/sequelizeOptions.js`
- `src/models/Document.js`, `src/models/PFMSTransaction.js`
- `src/controllers/documentController.js`, `src/controllers/financeController.js`,
  `src/controllers/projectController.js`, `src/controllers/fundRequestController.js`,
  `src/controllers/academicMetricController.js`
- `src/services/financePipelineService.js`
- `src/workers/disbursementWorker.js`, `src/queues/disbursementQueue.js`
- `src/utils/idMatch.js` (new)
- `migrations/20260717000000-repoint-uuid-fks-to-id.js` (new)

Frontend:
- `src/pages/admin/EventRequests.jsx`

---

## Not bugs (clarified)

- `GET /finance/statements/*` → 403 for finance: ADMIN-only by design; the
  Settlement page doesn't use them.
- Event/equipment create "500" in ad-hoc tests were malformed **test** payloads —
  the frontend sends the correct fields (`eventTitle`/`dates`,
  `requestedAmount`); verified with the real payload shapes.

## Recommended follow-ups (not blocking)

- One staging smoke-test of the **BullMQ** disbursement path (Redis transport) —
  logic is verified via the synchronous dev path, transport isn't.
- The `updateEventRequestStatus`/`createEventRequest` controllers return **500**
  (not 400) on validation errors — harmless for valid input, but 400 would be
  cleaner.
- Eliminate the id/_id divergence at the source (populate `_id = id` on create, or
  drop the redundant `_id` columns) so future code can't reintroduce this class of
  bug. `idMatch` makes the current code correct regardless.
