# Source-of-Truth Stabilization Report

**Goal:** every portal reflects the same business state, derived from the database
(Projects, FundRequests, Disbursements, FundAllocations, Ledger, Revenue) — no
independent/duplicated calculations, no mock/hardcoded values.

**Method:** verified against a real running Postgres + backend, driving the full
faculty→admin→finance workflow and comparing what each portal reports.

---

## ✅ One-source-of-truth proof

After one project + one ₹15,000 installment (plus prior test data), the **disbursed
total** as computed independently by each endpoint:

| Source | totalDisbursed |
|---|---|
| Faculty `/faculty/projects/stats` | ₹170,000 |
| Admin `/dashboard` | ₹170,000 |
| Finance `/finance/financial-reports` | ₹170,000 |
| Finance `/finance/fund-flow` (totalOut) | ₹170,000 |
| Finance `/finance/fund-sources/overview` (totalUsed) | ₹170,000 |

All five agree — they all sum the same non-reversed `Disbursements`.

---

## Issues fixed

### 1. Faculty Dashboard showed 0 (Active Projects / Disbursed / Allocated)
- **Root cause:** `/faculty/projects/stats` used `getFacultyDashboardData`, which
  returned `totalDisbursed` (the stats endpoint read `totalReleased`, a different
  name → 0) and `totalAllocated: 0` (bug in the shared aggregate). It also didn't
  return `activeProjects`.
- **Fix:** rewrote `getFacultyStats` to compute directly from the faculty's own
  `Projects` + non-reversed `Disbursements` (`computeReleasedByProject`) — returns
  real `activeProjects`, `totalAllocated`, `totalDisbursed`, `remaining`,
  `facultyDisbursed`, `facultyApprovedFunds`.
- **Verified:** activeProjects 5, totalAllocated ₹1.16Cr, totalDisbursed ₹170K,
  remaining ₹1.143Cr.

### 2. Installment state machine (First vs Next)
- **Root cause:** the faculty projects API returned no `releasedBudget` and no
  `Disbursements`, so the page's released amount was always 0 → always "Request
  First Installment", even after Installment #1 was released.
- **Fix:** `/faculty/projects` now attaches `releasedBudget` and `remainingBudget`
  per project, computed from non-reversed disbursements (single source). Combined
  with the earlier frontend label fix, the button now derives First vs Next from
  the actual released amount.
- **Verified:** a disbursed project returns `releasedBudget: 15000`.

### 3. Remaining = Allocated − Released (consistent everywhere)
- `/faculty/projects` (`remainingBudget`), `/faculty/projects/stats` (`remaining`),
  `/dashboard` (`remaining`), and `/finance/fund-sources/overview`
  (`remainingBalance`) all compute Allocated − Released from the same disbursement
  sums.

### 4. Execute Disbursement crash — "Cannot destructure property amount of req.body"
- **Root cause:** in Express 5, `req.body` is `undefined` when a request has no
  parsed JSON body; `sanitizeFinancialInput` destructured `{ amount } = req.body`
  → crash.
- **Fix:** the middleware now sets `req.body = {}` when missing before destructuring.
- **Verified:** an execute request with no body no longer 500s.

### 5. Reports "D.map is not a function"
- **Root cause:** `ODRequests.jsx` did `response.data.data.map(...)` unguarded.
- **Fix:** `(Array.isArray(response.data?.data) ? … : []).map(...)`.

### 6. Financial Reports "Live Summary ₹0"
- **Root cause:** `getFinancialReports` returned a bare array; the page reads
  `res.data.totalDisbursed / totalSanctioned / netFlow / outflows / inflows`.
- **Fix:** the endpoint now returns those summary fields from the ledger
  (disbursements + revenue + project budgets), defaulting to the current FY when no
  dates are passed.
- **Verified:** `totalDisbursed 170000, totalSanctioned 11600000, netFlow -170000,
  outflows 4`.

### 7. Finance notifications not appearing
- **Root cause:** approving a fund request notified only the faculty; Finance got
  nothing about pending disbursements.
- **Fix:** approval now also `notifyRole('FINANCE_OFFICER', 'Fund Request Ready for
  Disbursement', …)`.
- **Verified:** finance notification count 0 → 1 on approval. (Proof-submit already
  notifies finance; disbursement notifies faculty; project submit notifies admin.)

### 8. Admin Dashboard fund overview (previous pass, re-verified)
- `/dashboard` returns `fundSources` + `totalAllocated/used/remaining`; populates
  once funds are allocated.

---

## Verification summary
- Full endpoint sweep across admin/faculty/finance → all 200/201 except the
  ADMIN-only statement routes (intentional 403).
- Full installment workflow completes with a balanced ledger.
- Cross-portal disbursed total identical across 5 independent sources.
- Frontend build: **Compiled successfully**; backend loads clean.

## Remaining risks
- Browser click-through QA still recommended (validated via API + build, not a
  headless browser).
- `getFacultyDashboardData` (old shared aggregate) is now unused by the stats
  endpoint; left in place (harmless) — could be removed in a cleanup.
- Admin dashboard 20s server cache (edits reflect within ~20s there; immediate via
  socket elsewhere).
- BullMQ worker validated via the synchronous dev pipeline (same code).
- Leaked Google key rotation is still an ops action outside the code.
