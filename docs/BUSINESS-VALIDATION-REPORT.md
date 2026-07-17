# Business Consistency & Production Validation Report

**Method:** validated against a **real running stack** — local PostgreSQL 16 with the
full production migration set, live backend, real JWTs for admin/faculty/finance,
and both production builds. Business rules were exercised end-to-end, not just
compiled.

**System date at validation:** 2026-07-17 → current Financial Year = **2026-2027**
(FY runs Apr–Mar). The backend `getCurrentFY()` is date-driven and already returns
`2026-2027`; the fixes below make the *frontend* and *derived cycles* consistent
with that single source.

---

## Issues found & fixed

### 1. Financial-Year inconsistency (Critical)
- **Root cause:** the frontend had a correct date-driven `getCurrentFY()` but many
  screens ignored it — hardcoded stale `<option>`s (`2024-2025`, `2023-2024`), a
  hardcoded academic cycle default (`2024-25`), hardcoded quarter labels
  (`Q1 FY 2024-25`), a hardcoded "FY 2025-26" caption, and a **duplicate** inline
  `getCurrentFY` in AdminDashboard. Backend controllers hardcoded cycles
  (`'2024-25'`, `'2023-24'`).
- **Business rule:** one authoritative current FY (2026-2027) everywhere; older
  years only as explicit history.
- **Files:**
  - `frontend/src/utils/fyUtils.js` — added `getFinancialYearOptions`,
    `getCurrentAcademicCycle`, `getAcademicCycleOptions` (all derived from
    `getCurrentFY`).
  - `ApproveFundRequests.jsx`, `FinanceManagerDashboard.jsx`, `FinanceDashboard.jsx`
    — FY dropdowns now map `getFinancialYearOptions()` (current marked "(Current)").
  - `AdminDashboard.jsx` — removed the duplicate `getCurrentFY`, imports the shared one.
  - `AcademicSupportDashboard.jsx`, `FinancialReports.jsx`, `FacultyDashboard.jsx`
    — dynamic cycles/labels.
  - `backend/src/utils/fyUtils.js` — added `getCurrentCycle()` (→ `2026-27`).
  - `academicMetricController.js` (3 sites), `odRequestController.js` — use
    `getCurrentCycle()` instead of hardcoded years.
- **Verified:** `getCurrentCycle()` → `2026-27`; frontend build compiles; no
  hardcoded stale years remain in the swept files.

### 2. Admin Dashboard lost the institutional fund overview (Critical)
- **Root cause:** AdminDashboard reads `dashboardData.fundSources` /
  `totalAllocated`/`used`/`remaining`, but `GET /dashboard` never returned them —
  the fund cards rendered empty.
- **Business rule:** admin must see Institutional/Director, PFMS, Other funds with
  Total Allocated / Utilized / Remaining.
- **File:** `backend/src/services/dashboardService.js` — dashboard now includes
  `fundSources` (from the canonical `getFundSourceOverview`) plus top-level
  `totalAllocated`, `used`, `remaining`.
- **Verified:** after allocating ₹30L to INSTITUTIONAL, `GET /dashboard` returns
  `fundSources:[{INSTITUTIONAL: allocated 3000000, used 40000, remaining 2960000}, PFMS, OTHERS]`
  and `totalAllocated 3000000 / used 40000 / remaining 2960000`.

### 3. Principal Investigator logic (Critical business rule)
- **Root cause:** `createProject` set `facultyId`/`pi` but created **no** PI
  `ProjectMember`, and the frontend `isPI` checked only `piId`/`userId` (neither
  exists on the Project model). Result: the submitting faculty wasn't recognised as
  PI and the "Request Installment" button stayed disabled — effectively forcing an
  admin PI assignment.
- **Business rule:** the faculty who submits a project **automatically** becomes PI;
  admin only *reassigns* if needed.
- **Files:** `projectController.js` (create a `role:'PI'` ProjectMember for the
  submitter + notify admins "New Project Submitted"); `FacultyRequestFunds.jsx`
  (`isPI` now recognises the project owner via `facultyId`).
- **Verified:** faculty creates a project → `GET /projects/:id/members` returns
  `[{role:"PI"}]`; admin notification count increments.

### 4. Fund-request stage label
- **Root cause:** the action always read "Request Next Installment".
- **Business rule:** show "Request First Installment" until something is released,
  then "Request Next Installment".
- **File:** `FacultyRequestFunds.jsx` — heading + button now switch on
  `releasedAmount > 0`.
- **Verified:** logic keys off the released amount already computed on the page.

### 5. Faculty assignment dropdowns showed non-faculty users
- **Root cause:** `AssignFaculty` and `EventRequests` mapped **all** `/auth/users`
  (admin/finance/auditor included).
- **Files:** both now `.filter(u => u.role === 'FACULTY')`.
- **Verified:** only FACULTY users remain assignable.

### 6. Fund synchronization / dashboard freshness (already fixed, re-verified)
- Editing fund values persists to the canonical key (bug-bash fix), reflects in
  `/finance/fund-sources/overview` (`totalUsed`/`remaining`) and now the admin
  dashboard. Live socket `finance:update` events verified previously.

---

## Workflows verified end-to-end (real DB)

| Workflow | Result |
|---|---|
| Project submit → PI auto-assigned → admin notified → admin approve (ACTIVE) | ✅ |
| Fund allocate → request → approve → disburse → **COMPLETED**, balanced ledger | ✅ (Expense debit = Bank credit) |
| Event create → admin approve (College Funded → fund pipeline) | ✅ |
| OD create → admin approve (cycle `2026-27`) | ✅ |
| Equipment request → approve → execute (disbursement) | ✅ |
| Notifications: Project Submitted, Fund Request, Approval, Disbursed, etc. | ✅ generated + persisted + correct read shape |
| Live sync: `finance:update` on approval + disbursement | ✅ (socket client) |
| Full endpoint sweep (all 3 roles) | ✅ all 200/201 except intentional role-403s |
| Frontend + backend builds | ✅ FE compiles 0 warnings; backend tests 7/7 |

## Screens/areas validated (via API tracing + code + build)
Admin Dashboard, Finance Dashboard, Faculty Dashboard, Projects, Approve Projects,
Assign Faculty, Fund Requests, Event Requests, OD Requests, Equipment
Disbursements, Documents/Verification, PFMS, Analytics, Notifications, Academic
Support, Financial Reports.

---

## Remaining risks / honest limitations

1. **Browser-level UI QA not performed headlessly.** Every screen was validated by
   tracing its API calls (all resolve, correct shapes) and confirming the
   production build compiles, but I did not click through each page in a real
   browser. Recommend a short manual click-through of the dashboards + fund-request
   flow before go-live.
2. **PDF/Excel export *content*** (not just the endpoints) wasn't byte-verified;
   the export endpoints return 200 and pull from the ledger.
3. **Admin Dashboard 20s server cache:** fund-overview changes reflect within ~20s
   on the dashboard endpoint (the frontend's socket + refetch shows edits
   immediately elsewhere). Lower `CACHE_TTL_MS` if you want the admin card fully
   real-time.
4. **Faculty eligibility** is filtered by role (FACULTY); finer eligibility by
   department/centre for a *specific* project is not applied — the dropdown shows
   all faculty, which is the common ERP behavior. Add project-scoped filtering if
   your process requires it.
5. **BullMQ worker** (production Redis path) validated only via the synchronous dev
   pipeline (same code); one staging smoke-test of the queue transport recommended.
6. **Malformed (non-UUID) ids** to lookups return 500 (Postgres uuid syntax) rather
   than a clean 404 — cannot occur from the UI (valid UUIDs only); a follow-up input
   guard would be tidier.

## Verdict
The core business workflows (project → PI → approval → allocation → installment →
disbursement → ledger → notifications → live sync) behave correctly and
consistently across Admin, Faculty, and Finance against a real database, on FY
2026-2027. With the short manual browser QA in item (1) and the leaked-key rotation
(tracked separately), the system is ready for a production deployment.
