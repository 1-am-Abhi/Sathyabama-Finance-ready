'use strict';

/**
 * Real foreign keys for the ledger, added as NOT VALID so the migration cannot
 * fail on any legacy orphan rows and does not take a long validating scan.
 *
 * IMPORTANT — the schema uses a dual id/_id key convention that is inconsistent
 * across tables:
 *   - Projects / FundRequests: `_id == id` (reconciled by the UUID-hardening
 *     migration), so an FK to either column is safe.
 *   - Disbursements: `_id != id` (each gets an independent gen_random_uuid()),
 *     and `Ledgers.disbursementId` is written as `disbursement._id || disbursement.id`
 *     — i.e. it is NOT guaranteed to be one or the other. A FK on it is therefore
 *     intentionally OMITTED here; reconcile the disbursement key convention
 *     first, then add it in a follow-up.
 *
 * Before running, check for orphans (these should return 0 rows):
 *
 *   SELECT l."id" FROM "Ledgers" l
 *   LEFT JOIN "Projects" p ON p."id" = l."projectId"
 *   WHERE l."projectId" IS NOT NULL AND p."id" IS NULL;
 *
 *   SELECT l."id" FROM "Ledgers" l
 *   LEFT JOIN "FundRequests" f ON f."id" = l."fundRequestId"
 *   WHERE l."fundRequestId" IS NOT NULL AND f."id" IS NULL;
 *
 * After applying and confirming clean data:
 *   ALTER TABLE "Ledgers" VALIDATE CONSTRAINT fk_ledgers_project;
 *   ALTER TABLE "Ledgers" VALIDATE CONSTRAINT fk_ledgers_fund_request;
 */

async function columnExists(q, table, column, transaction) {
  const rows = await q.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=:table AND column_name=:column LIMIT 1`,
    { replacements: { table, column }, type: q.QueryTypes.SELECT, transaction }
  );
  return rows.length > 0;
}
async function constraintExists(q, name, transaction) {
  const rows = await q.query(
    `SELECT 1 FROM pg_constraint WHERE conname = :name LIMIT 1`,
    { replacements: { name }, type: q.QueryTypes.SELECT, transaction }
  );
  return rows.length > 0;
}

const FKS = [
  // constraint, table, column, refTable, refColumn
  ['fk_ledgers_project', 'Ledgers', 'projectId', 'Projects', 'id'],
  ['fk_ledgers_fund_request', 'Ledgers', 'fundRequestId', 'FundRequests', 'id'],
];

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    await q.transaction(async (transaction) => {
      for (const [name, table, column, refTable, refColumn] of FKS) {
        if (!(await columnExists(q, table, column, transaction))) continue;
        if (await constraintExists(q, name, transaction)) continue;
        await q.query(
          `ALTER TABLE "${table}"
           ADD CONSTRAINT "${name}"
           FOREIGN KEY ("${column}") REFERENCES "${refTable}" ("${refColumn}")
           ON DELETE SET NULL NOT VALID;`,
          { transaction }
        );
      }
    });
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    await q.transaction(async (transaction) => {
      for (const [name, table] of FKS) {
        await q.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${name}";`, { transaction });
      }
    });
  },
};
