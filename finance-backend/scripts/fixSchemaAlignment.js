const { sequelize } = require('../src/config/db');
const logger = require('../src/utils/logger');

const fixSchemaAlignment = async () => {
    try {
        logger.info('Starting HARDENED GLOBAL Schema Alignment...');

        await sequelize.transaction(async (t) => {
            // --- USERS TABLE ---
            await sequelize.query(`
                ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "organizationId" INTEGER;
            `, { transaction: t });

            const [orgTable] = await sequelize.query(`
                SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Organizations');
            `, { transaction: t });

            if (orgTable[0].exists) {
                await sequelize.query(`
                    ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "fk_users_org";
                    ALTER TABLE "Users" ADD CONSTRAINT "fk_users_org" 
                    FOREIGN KEY ("organizationId") REFERENCES "Organizations"(id) ON DELETE RESTRICT;
                `, { transaction: t });
            }
            logger.info('✔ Users: organizationId and FK verified/added');

            // --- LEDGERS TABLE ---
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
            
            // Data Mapping (Enum-safe)
            await sequelize.query(`
                UPDATE "Ledgers" 
                SET "debit" = "amount" 
                WHERE "debit" = 0 AND "entryType"::TEXT = 'DISBURSEMENT' AND "amount" > 0;
                
                UPDATE "Ledgers" 
                SET "credit" = "amount" 
                WHERE "credit" = 0 AND "entryType"::TEXT = 'REVENUE' AND "amount" > 0;
            `, { transaction: t });

            // Ledgers Constraints & Indexes
            await sequelize.query(`
                ALTER TABLE "Ledgers" DROP CONSTRAINT IF EXISTS "fk_ledgers_account";
                ALTER TABLE "Ledgers" ADD CONSTRAINT "fk_ledgers_account" FOREIGN KEY ("accountId") REFERENCES "Accounts"(id) ON DELETE SET NULL;
                
                ALTER TABLE "Ledgers" DROP CONSTRAINT IF EXISTS "fk_ledgers_journal";
                ALTER TABLE "Ledgers" ADD CONSTRAINT "fk_ledgers_journal" FOREIGN KEY ("journalId") REFERENCES "JournalEntries"(id) ON DELETE SET NULL;
                
                CREATE INDEX IF NOT EXISTS "ledgers_journal_id" ON "Ledgers" ("journalId");
                CREATE INDEX IF NOT EXISTS "ledgers_account_id" ON "Ledgers" ("accountId");
                CREATE INDEX IF NOT EXISTS "ledgers_hash" ON "Ledgers" ("hash");
            `, { transaction: t });
            logger.info('✔ Ledgers: Comprehensive alignment complete');
        });

        logger.info('✅ HARDENED GLOBAL Schema Alignment complete.');
        process.exit(0);
    } catch (error) {
        logger.error('❌ Schema alignment failed:', error);
        process.exit(1);
    }
};

fixSchemaAlignment();
