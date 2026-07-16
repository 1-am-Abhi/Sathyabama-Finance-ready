'use strict';

/**
 * DB-level immutability for the financial audit tables.
 *
 * The app already blocks UPDATE/DELETE on Ledgers (and never mutates
 * JournalEntries / AuditLogs / LedgerSnapshots) via Sequelize hooks, but hooks
 * only protect the ORM path — a raw SQL statement, a bulk operation, or a
 * different connection could still mutate these rows. These triggers enforce
 * append-only at the database, closing that gap and making the SHA-256 hash
 * chain genuinely tamper-evident.
 *
 * Nothing legitimate performs UPDATE/DELETE on these tables, so this is
 * behaviourally transparent to the running app. INSERTs are unaffected.
 *
 * Idempotent and fully reversible.
 */

const TABLES = ['Ledgers', 'JournalEntries', 'AuditLogs', 'LedgerSnapshots'];

async function tableExists(queryInterface, tableName, transaction) {
  const rows = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = :tableName LIMIT 1`,
    { replacements: { tableName }, type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
  );
  return rows.length > 0;
}

module.exports = {
  async up(queryInterface) {
    const q = queryInterface.sequelize;
    await q.transaction(async (transaction) => {
      // Shared trigger function that always blocks the operation.
      await q.query(
        `CREATE OR REPLACE FUNCTION finance_block_mutation()
         RETURNS trigger AS $$
         BEGIN
           RAISE EXCEPTION 'IMMUTABILITY VIOLATION: % on % is not allowed (append-only financial record).', TG_OP, TG_TABLE_NAME
             USING ERRCODE = 'check_violation';
         END;
         $$ LANGUAGE plpgsql;`,
        { transaction }
      );

      for (const table of TABLES) {
        if (!(await tableExists(queryInterface, table, transaction))) continue;
        const trigName = `trg_${table.toLowerCase()}_immutable`;
        await q.query(`DROP TRIGGER IF EXISTS ${trigName} ON "${table}";`, { transaction });
        await q.query(
          `CREATE TRIGGER ${trigName}
           BEFORE UPDATE OR DELETE ON "${table}"
           FOR EACH ROW EXECUTE FUNCTION finance_block_mutation();`,
          { transaction }
        );
      }
    });
  },

  async down(queryInterface) {
    const q = queryInterface.sequelize;
    await q.transaction(async (transaction) => {
      for (const table of TABLES) {
        if (!(await tableExists(queryInterface, table, transaction))) continue;
        const trigName = `trg_${table.toLowerCase()}_immutable`;
        await q.query(`DROP TRIGGER IF EXISTS ${trigName} ON "${table}";`, { transaction });
      }
      await q.query(`DROP FUNCTION IF EXISTS finance_block_mutation();`, { transaction });
    });
  },
};
