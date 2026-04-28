const { sequelize } = require('../src/config/db');
const logger = require('../src/utils/logger');

const fixLedgerSchema = async () => {
    try {
        logger.info('Starting safe Ledger schema alignment...');

        // 1. Add accountId column if it doesn't exist
        await sequelize.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                               WHERE table_name='Ledgers' AND column_name='accountId') THEN
                    ALTER TABLE "Ledgers" ADD COLUMN "accountId" UUID;
                END IF;
            END $$;
        `);
        logger.info('✔ accountId column verified/added');

        // 2. Create index if it doesn't exist
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS "ledgers_account_id" 
            ON "Ledgers" ("accountId");
        `);
        logger.info('✔ Index ledgers_account_id verified/created');

        logger.info('✅ Schema alignment complete.');
        process.exit(0);
    } catch (error) {
        logger.error('❌ Schema alignment failed:', error);
        process.exit(1);
    }
};

fixLedgerSchema();
