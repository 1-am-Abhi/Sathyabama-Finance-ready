'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const ledgerSchema = await queryInterface.describeTable('Ledgers').catch(() => ({}));
      const accountSchema = await queryInterface.describeTable('Accounts').catch(() => ({}));
      const journalExists = await queryInterface.sequelize.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = current_schema()
          AND tablename = 'JournalEntries'
      `, { transaction: t });

      await queryInterface.sequelize.query(`
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "id" UUID DEFAULT gen_random_uuid();
      `, { transaction: t });

      await queryInterface.sequelize.query(`
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "journalId" UUID;
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "debit" DECIMAL(15,2) DEFAULT 0.00;
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "credit" DECIMAL(15,2) DEFAULT 0.00;
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "balanceAfter" DECIMAL(15,2);
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "hash" VARCHAR(64);
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "previousHash" VARCHAR(64);
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
      `, { transaction: t });

      const hasAmount = !!ledgerSchema.amount;
      const hasEntryType = !!ledgerSchema.entryType;

      if (hasAmount && hasEntryType) {
        await queryInterface.sequelize.query(`
          UPDATE "Ledgers"
          SET "debit" = "amount"
          WHERE COALESCE("debit", 0) = 0
            AND "entryType"::TEXT = 'DISBURSEMENT'
            AND "amount" > 0;

          UPDATE "Ledgers"
          SET "credit" = "amount"
          WHERE COALESCE("credit", 0) = 0
            AND "entryType"::TEXT = 'REVENUE'
            AND "amount" > 0;
        `, { transaction: t });
      } else {
        console.log('[Migration] Skipping ledger debit/credit backfill: amount or entryType missing');
      }

      if (ledgerSchema.accountId && accountSchema.id) {
        await queryInterface.sequelize.query(`
          ALTER TABLE "Ledgers" DROP CONSTRAINT IF EXISTS "fk_ledgers_account";
          ALTER TABLE "Ledgers"
          ADD CONSTRAINT "fk_ledgers_account"
          FOREIGN KEY ("accountId") REFERENCES "Accounts"("id") ON DELETE SET NULL;
        `, { transaction: t });
      } else {
        console.log('[Migration] Skipping fk_ledgers_account: accountId or Accounts.id missing');
      }

      if (journalExists[0].length && ledgerSchema.journalId) {
        await queryInterface.sequelize.query(`
          ALTER TABLE "Ledgers" DROP CONSTRAINT IF EXISTS "fk_ledgers_journal";
          ALTER TABLE "Ledgers"
          ADD CONSTRAINT "fk_ledgers_journal"
          FOREIGN KEY ("journalId") REFERENCES "JournalEntries"("id") ON DELETE SET NULL;
        `, { transaction: t });
      } else {
        console.log('[Migration] Skipping fk_ledgers_journal: JournalEntries or journalId missing');
      }

      if (ledgerSchema.journalId || true) {
        await queryInterface.sequelize.query(`
          CREATE INDEX IF NOT EXISTS "ledgers_journal_id" ON "Ledgers" ("journalId");
        `, { transaction: t }).catch(() => {});
      }

      if (ledgerSchema.accountId) {
        await queryInterface.sequelize.query(`
          CREATE INDEX IF NOT EXISTS "ledgers_account_id" ON "Ledgers" ("accountId");
        `, { transaction: t }).catch(() => {});
      }

      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS "ledgers_hash" ON "Ledgers" ("hash");
      `, { transaction: t }).catch(() => {});
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeConstraint('Ledgers', 'fk_ledgers_account').catch(() => {});
    await queryInterface.removeConstraint('Ledgers', 'fk_ledgers_journal').catch(() => {});
  }
};
