const { sequelize } = require('../src/config/db');
const logger = require('../src/utils/logger');

const fixLedgerSchema = async () => {
    try {
        logger.info('Starting SAFE COMPREHENSIVE Ledger schema alignment...');

        await sequelize.transaction(async (t) => {
            // 1. Core ID and missing columns
            await sequelize.query(`
                ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "id" UUID DEFAULT gen_random_uuid();
                ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "journalId" UUID;
                ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "debit" DECIMAL(15,2) DEFAULT 0.00;
                ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "credit" DECIMAL(15,2) DEFAULT 0.00;
                ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "balanceAfter" DECIMAL(15,2);
                ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "hash" VARCHAR(64);
                ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "previousHash" VARCHAR(64);
                ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
            `, { transaction: t });
            logger.info('✔ Missing functional columns verified/added');

            // 2. Data Migration (With Enum Safety)
            await sequelize.query(`
                UPDATE "Ledgers" 
                SET "debit" = "amount" 
                WHERE "debit" = 0 AND "entryType"::TEXT = 'DISBURSEMENT' AND "amount" > 0;
                
                UPDATE "Ledgers" 
                SET "credit" = "amount" 
                WHERE "credit" = 0 AND "entryType"::TEXT = 'REVENUE' AND "amount" > 0;
            `, { transaction: t });
            logger.info('✔ Legacy data mapped to new schema (Enum-safe)');

            // 3. Constraints
            await sequelize.query(`
                ALTER TABLE "Ledgers" DROP CONSTRAINT IF EXISTS "fk_ledgers_account";
                ALTER TABLE "Ledgers" ADD CONSTRAINT "fk_ledgers_account" FOREIGN KEY ("accountId") REFERENCES "Accounts"(id) ON DELETE SET NULL;
                
                ALTER TABLE "Ledgers" DROP CONSTRAINT IF EXISTS "fk_ledgers_journal";
                ALTER TABLE "Ledgers" ADD CONSTRAINT "fk_ledgers_journal" FOREIGN KEY ("journalId") REFERENCES "JournalEntries"(id) ON DELETE SET NULL;
            `, { transaction: t });
            logger.info('✔ Data integrity constraints verified/added');

            // 4. Indexes
            await sequelize.query(`
                CREATE INDEX IF NOT EXISTS "ledgers_journal_id" ON "Ledgers" ("journalId");
                CREATE INDEX IF NOT EXISTS "ledgers_account_id" ON "Ledgers" ("accountId");
                CREATE INDEX IF NOT EXISTS "ledgers_hash" ON "Ledgers" ("hash");
            `, { transaction: t });
            logger.info('✔ Performance indexes verified/added');
        });

        logger.info('✅ SAFE COMPREHENSIVE Schema alignment complete.');
        process.exit(0);
    } catch (error) {
        logger.error('❌ Schema alignment failed:', error);
        process.exit(1);
    }
};

fixLedgerSchema();
