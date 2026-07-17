'use strict';

/**
 * Repoint mis-targeted foreign keys from `_id` to `id`.
 *
 * The convergence migrations added FKs on Disbursements/PFMSTransactions that
 * reference FundRequests("_id") / Projects("_id"). But the application stores the
 * model PRIMARY KEY `id` in those FK columns (getRecordId() returns `id`, since
 * the models don't populate `_id`). For rows where `id != _id` (any Project/
 * FundRequest created after the UUID hardening migration), inserting a
 * Disbursement fails with:
 *   violates foreign key constraint "fk_disbursements_fund_request_uuid"
 * i.e. EVERY disbursement of a newer fund request is blocked.
 *
 * Fix: drop those FKs and recreate them against the target's `id` (the PK the app
 * actually uses). Added NOT VALID so existing rows aren't rescanned and the
 * migration can't fail on legacy data. The Documents.facultyId -> Users("_id")
 * FK is intentionally left alone: Users' PK is an integer `id` and its UUID join
 * key really is `_id`, so that one is correct.
 *
 * Idempotent and reversible.
 */

const REPOINTS = [
  // constraint name, table, column, referenced table
  ['fk_disbursements_fund_request_uuid', 'Disbursements', 'fundRequestId', 'FundRequests'],
  ['fk_disbursements_project_uuid', 'Disbursements', 'projectId', 'Projects'],
  ['fk_pfms_transactions_project_uuid', 'PFMSTransactions', 'projectId', 'Projects'],
];

async function tableExists(q, name, transaction) {
  const rows = await q.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=:name LIMIT 1`,
    { replacements: { name }, type: q.QueryTypes.SELECT, transaction }
  );
  return rows.length > 0;
}

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    await q.transaction(async (transaction) => {
      for (const [name, table, column, refTable] of REPOINTS) {
        if (!(await tableExists(q, table, transaction))) continue;
        await q.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${name}";`, { transaction });
        await q.query(
          `ALTER TABLE "${table}"
           ADD CONSTRAINT "${name}"
           FOREIGN KEY ("${column}") REFERENCES "${refTable}" ("id")
           ON DELETE SET NULL NOT VALID;`,
          { transaction }
        );
      }
    });
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    await q.transaction(async (transaction) => {
      // Restore the previous (_id-targeted) definitions.
      const originals = [
        ['fk_disbursements_fund_request_uuid', 'Disbursements', 'fundRequestId', 'FundRequests'],
        ['fk_disbursements_project_uuid', 'Disbursements', 'projectId', 'Projects'],
        ['fk_pfms_transactions_project_uuid', 'PFMSTransactions', 'projectId', 'Projects'],
      ];
      for (const [name, table, column, refTable] of originals) {
        if (!(await tableExists(q, table, transaction))) continue;
        await q.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${name}";`, { transaction });
        await q.query(
          `ALTER TABLE "${table}"
           ADD CONSTRAINT "${name}"
           FOREIGN KEY ("${column}") REFERENCES "${refTable}" ("_id")
           ON DELETE SET NULL NOT VALID;`,
          { transaction }
        );
      }
    });
  },
};
