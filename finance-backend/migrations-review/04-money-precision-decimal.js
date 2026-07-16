'use strict';

/**
 * ⚠️  HIGH RISK — DO NOT RUN STANDALONE. Read this whole header first.
 *
 * Converts floating-point money columns to NUMERIC(15,2). Storing money as
 * FLOAT (as FundRequests.requestedAmount, Projects.sanctionedBudget and the
 * granularity fields currently are) allows rounding drift; NUMERIC(15,2) is the
 * correct representation and matches what Disbursements/Ledgers already use.
 *
 * PREREQUISITE — coordinate these together, or money math WILL break:
 *   1. Change the corresponding Sequelize model fields from `DataTypes.FLOAT`
 *      to `DataTypes.DECIMAL(15, 2)` (FundRequest.requestedAmount,
 *      Project.sanctionedBudget, and the equipment/consumables/etc. granularity
 *      fields on FundRequest).
 *   2. Sequelize returns DECIMAL columns as STRINGS, not numbers. Audit every
 *      consumer (backend `safeNumber(...)` already coerces; the FRONTEND must
 *      also coerce — verify charts/tables call Number(...) before arithmetic).
 *   3. Run the full test/verify pass and check dashboards before deploying.
 *
 * Because of prerequisite (1)/(2), this file lives in migrations-review/ and is
 * intentionally NOT in the auto-run migrations/ folder. Apply it only as a
 * planned, tested change.
 *
 * The conversion itself is a safe widening cast (double precision -> numeric)
 * and is reversible.
 */

async function columnExists(q, table, column, transaction) {
  const rows = await q.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name=:table AND column_name=:column LIMIT 1`,
    { replacements: { table, column }, type: q.QueryTypes.SELECT, transaction }
  );
  return rows.length > 0;
}

const MONEY_COLUMNS = [
  ['FundRequests', 'requestedAmount'],
  ['Projects', 'sanctionedBudget'],
  ['FundRequests', 'majorEquipments'],
  ['FundRequests', 'minorEquipments'],
  ['FundRequests', 'consumables'],
  ['FundRequests', 'services'],
  ['FundRequests', 'amc'],
];

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    await q.transaction(async (transaction) => {
      for (const [table, column] of MONEY_COLUMNS) {
        if (!(await columnExists(q, table, column, transaction))) continue;
        await q.query(
          `ALTER TABLE "${table}"
           ALTER COLUMN "${column}" TYPE NUMERIC(15,2)
           USING ROUND("${column}"::numeric, 2);`,
          { transaction }
        );
      }
    });
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    await q.transaction(async (transaction) => {
      for (const [table, column] of MONEY_COLUMNS) {
        if (!(await columnExists(q, table, column, transaction))) continue;
        await q.query(
          `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE DOUBLE PRECISION USING "${column}"::double precision;`,
          { transaction }
        );
      }
    });
  },
};
