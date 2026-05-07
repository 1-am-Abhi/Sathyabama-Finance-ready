'use strict';

const ORG_TABLES = [
  { name: 'Users', index: 'idx_users_org' },
  { name: 'Projects', index: 'idx_projects_org' },
  { name: 'FundRequests', index: 'idx_fund_requests_org' },
  { name: 'EventRequests', index: 'idx_event_requests_org' },
  { name: 'Disbursements', index: 'idx_disbursements_org' },
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
        { transaction }
      );

      for (const table of ORG_TABLES) {
        await queryInterface.sequelize.query(`
          DO $$
          BEGIN
            IF to_regclass('"${table.name}"') IS NOT NULL THEN
              ALTER TABLE "${table.name}" ADD COLUMN IF NOT EXISTS "organizationId" VARCHAR(255);
              UPDATE "${table.name}" SET "organizationId" = 'ORG_1' WHERE "organizationId" IS NULL;
              ALTER TABLE "${table.name}" ALTER COLUMN "organizationId" SET DEFAULT 'ORG_1';
              ALTER TABLE "${table.name}" ALTER COLUMN "organizationId" SET NOT NULL;
              CREATE INDEX IF NOT EXISTS "${table.index}" ON "${table.name}"("organizationId");
            END IF;
          END $$;
        `, { transaction });
      }

      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF to_regclass('"Ledgers"') IS NOT NULL THEN
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "id" UUID DEFAULT gen_random_uuid();
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "journalId" UUID;
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "accountId" UUID;
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "projectId" UUID;
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "fundRequestId" UUID;
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "disbursementId" UUID;
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "revenueId" UUID;
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "createdByUserId" UUID;
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "debit" DECIMAL(15,2) DEFAULT 0.00;
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "credit" DECIMAL(15,2) DEFAULT 0.00;
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "balanceAfter" DECIMAL(15,2);
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "referenceId" VARCHAR(255);
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "hash" VARCHAR(64);
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "previousHash" VARCHAR(64);
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "description" TEXT;
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "metadata" JSONB;

            CREATE INDEX IF NOT EXISTS "ledgers_journal_id" ON "Ledgers" ("journalId");
            CREATE INDEX IF NOT EXISTS "ledgers_account_id" ON "Ledgers" ("accountId");
            CREATE INDEX IF NOT EXISTS "idx_ledger_disbursement" ON "Ledgers" ("disbursementId");
            CREATE INDEX IF NOT EXISTS "ledger_disbursement_journal_idx" ON "Ledgers" ("disbursementId", "journalId");
            CREATE INDEX IF NOT EXISTS "ledgers_hash" ON "Ledgers" ("hash");

            IF to_regclass('"Accounts"') IS NOT NULL THEN
              ALTER TABLE "Ledgers" DROP CONSTRAINT IF EXISTS "fk_ledgers_account";
              ALTER TABLE "Ledgers"
                ADD CONSTRAINT "fk_ledgers_account"
                FOREIGN KEY ("accountId") REFERENCES "Accounts"(id) ON DELETE SET NULL;
            END IF;

            IF to_regclass('"JournalEntries"') IS NOT NULL THEN
              ALTER TABLE "Ledgers" DROP CONSTRAINT IF EXISTS "fk_ledgers_journal";
              ALTER TABLE "Ledgers"
                ADD CONSTRAINT "fk_ledgers_journal"
                FOREIGN KEY ("journalId") REFERENCES "JournalEntries"(id) ON DELETE SET NULL;
            END IF;
          END IF;
        END $$;
      `, { transaction });

      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF to_regclass('"Disbursements"') IS NOT NULL THEN
            ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "referenceId" VARCHAR(255);
            ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(255);
          END IF;
        END $$;
      `, { transaction });

      const [disbRows] = await queryInterface.sequelize.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'Disbursements'
      `, { transaction });

      const disbCols = new Set(disbRows.map(r => r.column_name));

      if (disbCols.has('referenceId')) {
        const refParts = ['NULLIF("referenceId", \'\')'];
        if (disbCols.has('bankReference')) refParts.push('NULLIF("bankReference", \'\')');
        if (disbCols.has('transactionId')) refParts.push('NULLIF("transactionId", \'\')');
        if (disbCols.has('chequeNumber')) refParts.push('NULLIF("chequeNumber", \'\')');
        if (disbCols.has('_id')) refParts.push('"_id"::text');
        if (disbCols.has('id')) refParts.push('"id"::text');

        await queryInterface.sequelize.query(`
          UPDATE "Disbursements"
          SET "referenceId" = COALESCE(${refParts.join(', ')})
          WHERE "referenceId" IS NULL OR "referenceId" = ''
        `, { transaction });

        await queryInterface.sequelize.query(`
          ALTER TABLE "Disbursements" ALTER COLUMN "referenceId" SET NOT NULL
        `, { transaction }).catch(() => {});
      }

      if (disbCols.has('amount')) {
        await queryInterface.sequelize.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'chk_amount_positive'
            ) THEN
              ALTER TABLE "Disbursements"
                ADD CONSTRAINT "chk_amount_positive" CHECK ("amount" > 0);
            END IF;
          END $$;
        `, { transaction });
      }

      if (disbCols.has('referenceId')) {
        await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS "unique_reference_id" ON "Disbursements" ("referenceId");
        `, { transaction });
      }

      if (disbCols.has('idempotencyKey')) {
        await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS "unique_disbursement_idempotency_key"
          ON "Disbursements" ("idempotencyKey")
          WHERE "idempotencyKey" IS NOT NULL;
        `, { transaction });
      }

      if (disbCols.has('fundRequestId')) {
        await queryInterface.sequelize.query(`
          CREATE INDEX IF NOT EXISTS "idx_disbursements_fund_request_id_final"
          ON "Disbursements" ("fundRequestId");
        `, { transaction });
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS "unique_disbursement_idempotency_key";
        DROP INDEX IF EXISTS "ledger_disbursement_journal_idx";
      `, { transaction });
    });
  },
};
