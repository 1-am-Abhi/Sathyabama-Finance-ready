# DB Hardening Migrations — FOR REVIEW (not auto-run)

These migrations are **deliberately kept out of `finance-backend/migrations/`** so they
do **not** run automatically on deploy (`render.yaml` runs `npm run migrate` at
startup). Review each one, then move the ones you approve into `migrations/`
(keep the numeric timestamp ordering) and run `npm run migrate` — ideally against
a **staging copy of production first**.

All migrations are written to be **idempotent** (safe to re-run) and
**non-destructive** (no data columns are dropped). Take a database backup before
applying any of them.

| File | Risk | What it does | Prerequisite |
|---|---|---|---|
| `01-ledger-immutability-triggers.js` | **Low** | Adds DB-level `BEFORE UPDATE/DELETE` triggers on `Ledgers`, `JournalEntries`, `AuditLogs`, `LedgerSnapshots` that raise an exception — enforcing append-only at the database, not just in Sequelize hooks. The app never updates/deletes these rows, so nothing legitimate breaks. | None |
| `02-integrity-indexes-and-checks.js` | **Low** | Adds missing indexes on foreign-key-ish columns (`Ledgers.disbursementId/fundRequestId/projectId`, `AuditLogs.entityType/entityId`, `Notifications.userId,isRead`, `Disbursements.status`) and a couple of positive-amount CHECK constraints (guarded, `NOT VALID` where existing data might violate). | None |
| `03-referential-fks-not-valid.js` | **Medium** | Adds real foreign keys (as `NOT VALID`, so existing rows aren't validated and the migration can't fail on legacy orphans) linking `Ledgers` → `Disbursements/FundRequests/Projects` and `Disbursements` → `FundRequests/Projects` on the `_id` keys. After applying, run `VALIDATE CONSTRAINT` manually once you've confirmed there are no orphans. | Confirm no orphan rows first |
| `04-money-precision-decimal.js` | **HIGH — do not run standalone** | Converts FLOAT money columns (`FundRequests.requestedAmount`, `Projects.sanctionedBudget`, granularity fields) to `NUMERIC(15,2)`. | **You must first change the Sequelize models to `DataTypes.DECIMAL(15,2)` and verify the frontend/analytics handle DECIMAL (which Sequelize returns as strings). Running this without the model change will silently break money math.** See the header of the file. |

## Recommended order

1. `01` — highest value, lowest risk. Apply first.
2. `02` — indexes + checks. Apply after 01.
3. `03` — FKs. Apply after checking for orphans (queries included in the file header).
4. `04` — only as a planned, coordinated change with model edits + a full test pass.

## How to apply one

```bash
# From finance-backend/, after reviewing:
cp migrations-review/01-ledger-immutability-triggers.js migrations/20260601000001-ledger-immutability-triggers.js
NODE_ENV=production npx sequelize-cli db:migrate
```

Every file has a working `down()` for reversibility (except `04`, whose down
reverts the type change).
