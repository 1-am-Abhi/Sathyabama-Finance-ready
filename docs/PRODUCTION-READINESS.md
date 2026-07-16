# Production Readiness Report

**System:** Sathyabama Research Finance & Event Management System
**Scope of this branch:** hardening + defect-fixing pass on an already-deployed app,
plus two approved feature changes (installment proof-gating, real Claude AI).
**Testing caveat:** backend changes were verified by static analysis + module
load-tests only — there was **no** access to a live/staging Postgres+Redis in this
environment. Everything financial/infra must be verified on staging before merge
(see DEPLOYMENT.md → post-deploy checklist).

---

## 1. Critical defects fixed

| # | Defect | Impact | Fix |
|---|---|---|---|
| C1 | **BullMQ disbursement worker never started** in production (nothing imported `workers/disbursementWorker.js`; prod uses the real queue). | Disbursements were enqueued but **never processed** in production. | Started the worker in `server.js` startup; rewrote it as a thin, non-duplicating consumer of the pipeline. |
| C2 | **Real-time dead** — `notificationService` emitted via `global.io` (never set); finance events targeted a `finance` room no socket joined. | Notifications + finance live updates were silent no-ops. | Routed emits through `socketInstance.getIO()`; sockets now auto-join the `finance` room by role. |
| C3 | **`rollbackDisbursement` broken** — wrote a `status` column the model didn't declare (silently dropped), used `bulkCreate` (bypassing ledger hash-chain/period hooks), never freed budget. | Reversals didn't reverse; ledger integrity at risk. | Rewrote as an atomic, row-locked, hash-safe balanced reversal; added `status` to the model; every budget SUM now excludes `REVERSED` rows (NULL-safe). |

## 2. Security fixes

- Removed a **committed live Google API key** (`finance-frontend/.env` untracked). **Action required: rotate the key and scrub git history.**
- Replaced a **reset-password stub that logged the plaintext password** with a real admin-only, hashed, audit-logged endpoint (`PUT /auth/users/:id/reset-password`).
- Closed **IDOR gaps**: OD update now enforces faculty ownership; single fund-request read is faculty-scoped; `/fund-requests/:id/advance` is role-gated.
- Removed dead/contradictory rate-limiters in `server.js` (real limiting is in `app.js`).
- Stripped debug `console.log` noise from the frontend (incl. the password log).

## 3. Approved feature changes

- **Installment proof-gating** — the next installment (N>1) is blocked until the
  previous installment's utilization (bills/invoices + UC) is verified by Finance.
  New faculty (`/proofs`) and finance (`/verify-utilization`, `/return-for-correction`)
  endpoints, a daily overdue-proof alert cron, and a config toggle
  (`PROOF_GATING_ENABLED`). Built on existing schema — no required migration.
- **Real Claude AI** — the fake `Math.random` AI service is replaced by a
  server-side Anthropic proxy (`/api/ai/proposal`, `/api/ai/analyze`), key held
  server-side, graceful 503 fallback when unconfigured.

## 4. Deployment fixes

- Frontend now serves the **optimized production build** via `node server.js`
  instead of the CRA dev server.
- Committed the **backend `package-lock.json`** so `npm ci` (used by Render)
  succeeds and dependency versions are reproducible.
- Documented + registered all new env vars in `render.yaml` and `.env.example`.

## 5. Data model hardening (reviewable, not auto-run)

`finance-backend/migrations-review/` contains idempotent, reversible migrations
for: DB-level ledger immutability triggers, FK-column indexes + amount CHECKs,
`NOT VALID` referential FKs, and a flagged money-precision (FLOAT→DECIMAL) change.
Review + apply to staging first; see that folder's README.

## 6. Frontend quality (this pass)

- Removed mock/random data from `AdminReports`, `ManagePFMS`, `FacultyDetail`,
  `ProjectDetail`.
- Route-level code-splitting (`React.lazy`) to shrink the single ~523 kB bundle.
- Targeted react-query cache invalidation (replaced blanket `invalidateQueries()`).
- Wired the AI features and the new proof-gating UI to the backend.

_(Frontend build is verified green as part of the PR; see the PR checks.)_

---

## Verification status

| Area | Verified here | Needs staging |
|---|---|---|
| Frontend production build | ✅ compiles (0 warnings baseline) | Visual QA of changed pages |
| Backend syntax + module load | ✅ | — |
| Disbursement worker end-to-end | ❌ (no Redis/DB) | ✅ must smoke-test |
| Rollback / budget math | ❌ | ✅ must smoke-test |
| Real-time sockets | ❌ | ✅ must verify |
| Proof-gating flow | ❌ (logic unit-checked) | ✅ end-to-end |
| AI endpoints | ❌ (needs key) | ✅ with `ANTHROPIC_API_KEY` |
| DB hardening migrations | authored, syntax-checked | ✅ apply to staging first |

---

## Remaining / optional improvements

**Should do before calling it fully production-grade:**
1. **Rotate the leaked Google API key + scrub git history** (the key remains in
   history even after untracking).
2. **Run the DB hardening migrations** (`migrations-review/`) on staging, starting
   with the ledger immutability triggers.
3. **Move money columns to DECIMAL** (migration 04 + coordinated model + frontend
   changes) to eliminate float drift.
4. **Reconcile the dual `id`/`_id` key convention** — especially `Disbursements`
   where `_id != id` — so referential FKs to disbursements are safe (blocks FK #3).

**Nice to have:**
5. Extract the disbursement worker into a dedicated Render Background Worker for
   scaling.
6. Two remaining aggregate reporting SUMs (`pipelineMetricsService`,
   `dashboardService`) still include reversed disbursements — low impact, but make
   them consistent with the `NON_REVERSED_DISBURSEMENT_WHERE` filter.
7. `Project.releasedBudget` is written by the pipeline but the model doesn't
   declare the field (silently dropped); "released" is derived from disbursement
   SUMs everywhere, so it's vestigial — either add the field to the model and keep
   it in sync, or remove the dead write.
8. OD metrics use a hardcoded academic cycle (`'2023-24'`) and OD lists for admins
   aren't org-scoped (`ODRequest` has no `organizationId`) — both need a product
   decision.
9. Consolidate duplicate/legacy frontend components and the leftover
   `ProjectContext` (superseded by `PipelineContext`).
10. Add automated tests (backend integration tests against a test DB; frontend
    component tests) — currently minimal.
11. Consider moving JWT out of `localStorage` (XSS exposure) to httpOnly cookies.

---

## Bottom line

The core finance engine is architecturally strong (transactional, row-locked,
double-entry, hash-chained, idempotent). This pass fixed the three defects that
made it non-functional or unsafe in production (unstarted worker, dead real-time,
broken rollback), closed real security gaps, implemented the two approved feature
changes, and fixed the frontend serving + lockfile deployment bugs. **It is ready
for a staging verification pass**, after which — with the leaked key rotated and
the reviewable hardening migrations applied — it is production-deployable.
