'use strict';

/**
 * Integrity + performance hardening: indexes on FK-ish columns that are queried
 * or joined but were unindexed, plus a couple of positive-amount CHECK
 * constraints. All statements are guarded so the migration is idempotent and
 * won't fail if an object already exists or a table/column is absent.
 *
 * CHECK constraints are added NOT VALID (they apply to new/updated rows but do
 * not scan existing rows), so the migration can't fail on legacy data. Run
 * `ALTER TABLE ... VALIDATE CONSTRAINT ...` later once data is known clean.
 */

async function columnExists(q, table, column, transaction) {
  const rows = await q.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=:table AND column_name=:column LIMIT 1`,
    { replacements: { table, column }, type: q.QueryTypes.SELECT, transaction }
  );
  return rows.length > 0;
}

const INDEXES = [
  ['Ledgers', 'disbursementId', 'idx_ledgers_disbursement_id'],
  ['Ledgers', 'fundRequestId', 'idx_ledgers_fund_request_id'],
  ['Ledgers', 'projectId', 'idx_ledgers_project_id'],
  ['AuditLogs', 'entityType', 'idx_auditlogs_entity_type'],
  ['AuditLogs', 'entityId', 'idx_auditlogs_entity_id'],
  ['Notifications', 'userId', 'idx_notifications_user_id'],
  ['Disbursements', 'status', 'idx_disbursements_status_review'],
];

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    await q.transaction(async (transaction) => {
      for (const [table, column, index] of INDEXES) {
        if (await columnExists(q, table, column, transaction)) {
          await q.query(
            `CREATE INDEX IF NOT EXISTS "${index}" ON "${table}" ("${column}");`,
            { transaction }
          );
        }
      }

      // Positive-amount guards (NOT VALID so existing rows are not scanned).
      const addCheck = async (table, column, constraint, expr) => {
        if (!(await columnExists(q, table, column, transaction))) return;
        const exists = await q.query(
          `SELECT 1 FROM pg_constraint WHERE conname = :constraint LIMIT 1`,
          { replacements: { constraint }, type: q.QueryTypes.SELECT, transaction }
        );
        if (exists.length === 0) {
          await q.query(
            `ALTER TABLE "${table}" ADD CONSTRAINT "${constraint}" CHECK (${expr}) NOT VALID;`,
            { transaction }
          );
        }
      };

      await addCheck('FundRequests', 'requestedAmount', 'chk_fundrequests_requested_amount_nonneg', '"requestedAmount" >= 0');
      await addCheck('Projects', 'sanctionedBudget', 'chk_projects_sanctioned_budget_nonneg', '"sanctionedBudget" >= 0');
    });
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    await q.transaction(async (transaction) => {
      for (const [, , index] of INDEXES) {
        await q.query(`DROP INDEX IF EXISTS "${index}";`, { transaction });
      }
      await q.query(`ALTER TABLE "FundRequests" DROP CONSTRAINT IF EXISTS "chk_fundrequests_requested_amount_nonneg";`, { transaction });
      await q.query(`ALTER TABLE "Projects" DROP CONSTRAINT IF EXISTS "chk_projects_sanctioned_budget_nonneg";`, { transaction });
    });
  },
};
