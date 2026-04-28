'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Ensure core UUID id exists
      await queryInterface.sequelize.query(`
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "id" UUID DEFAULT gen_random_uuid();
      `, { transaction: t });

      // 2. Add missing functional columns
      await queryInterface.sequelize.query(`
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "journalId" UUID;
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "debit" DECIMAL(15,2) DEFAULT 0.00;
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "credit" DECIMAL(15,2) DEFAULT 0.00;
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "balanceAfter" DECIMAL(15,2);
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "hash" VARCHAR(64);
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "previousHash" VARCHAR(64);
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
      `, { transaction: t });

      // 3. Data Migration with TEXT casting for enum safety
      await queryInterface.sequelize.query(`
        UPDATE "Ledgers" 
        SET "debit" = "amount" 
        WHERE "debit" = 0 AND "entryType"::TEXT = 'DISBURSEMENT' AND "amount" > 0;
        
        UPDATE "Ledgers" 
        SET "credit" = "amount" 
        WHERE "credit" = 0 AND "entryType"::TEXT = 'REVENUE' AND "amount" > 0;
      `, { transaction: t });

      // 4. Add Constraints
      await queryInterface.sequelize.query(`
        ALTER TABLE "Ledgers" DROP CONSTRAINT IF EXISTS "fk_ledgers_account";
        ALTER TABLE "Ledgers" ADD CONSTRAINT "fk_ledgers_account" FOREIGN KEY ("accountId") REFERENCES "Accounts"(id) ON DELETE SET NULL;
        
        ALTER TABLE "Ledgers" DROP CONSTRAINT IF EXISTS "fk_ledgers_journal";
        ALTER TABLE "Ledgers" ADD CONSTRAINT "fk_ledgers_journal" FOREIGN KEY ("journalId") REFERENCES "JournalEntries"(id) ON DELETE SET NULL;
      `, { transaction: t });

      // 5. Add Indexes
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS "ledgers_journal_id" ON "Ledgers" ("journalId");
        CREATE INDEX IF NOT EXISTS "ledgers_account_id" ON "Ledgers" ("accountId");
        CREATE INDEX IF NOT EXISTS "ledgers_hash" ON "Ledgers" ("hash");
      `, { transaction: t });
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('Ledgers', 'fk_ledgers_account');
    await queryInterface.removeConstraint('Ledgers', 'fk_ledgers_journal');
  }
};
