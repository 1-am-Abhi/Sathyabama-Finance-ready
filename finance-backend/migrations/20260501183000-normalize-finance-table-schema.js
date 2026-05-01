'use strict';

const CANONICAL_TABLES = [
  'Users',
  'Projects',
  'FundRequests',
  'EventRequests',
  'Disbursements',
  'Accounts',
  'JournalEntries',
  'Ledgers',
];

const ORG_TABLES = [
  'Users',
  'Projects',
  'FundRequests',
  'EventRequests',
  'Disbursements',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', { transaction });

      for (const table of CANONICAL_TABLES) {
        await queryInterface.sequelize.query(`
          DO $$
          DECLARE
            actual_name text;
          BEGIN
            SELECT table_name INTO actual_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND lower(table_name) = lower('${table}')
            ORDER BY CASE WHEN table_name = '${table}' THEN 0 ELSE 1 END
            LIMIT 1;

            IF actual_name IS NOT NULL AND actual_name <> '${table}' AND to_regclass('public."${table}"') IS NULL THEN
              EXECUTE format('ALTER TABLE public.%I RENAME TO %I', actual_name, '${table}');
            END IF;
          END $$;
        `, { transaction });
      }

      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "Accounts" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "name" VARCHAR(255) NOT NULL UNIQUE,
          "code" VARCHAR(255) NOT NULL UNIQUE,
          "type" VARCHAR(255) NOT NULL,
          "description" TEXT,
          "isActive" BOOLEAN DEFAULT TRUE,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "JournalEntries" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "description" TEXT NOT NULL,
          "referenceId" VARCHAR(255),
          "transactionDate" TIMESTAMPTZ DEFAULT NOW(),
          "metadata" JSONB,
          "createdByUserId" UUID,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "Ledgers" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "journalId" UUID,
          "accountId" UUID,
          "projectId" UUID,
          "fundRequestId" UUID,
          "disbursementId" UUID,
          "revenueId" UUID,
          "createdByUserId" UUID,
          "debit" DECIMAL(15,2) DEFAULT 0.00,
          "credit" DECIMAL(15,2) DEFAULT 0.00,
          "balanceAfter" DECIMAL(15,2),
          "referenceId" VARCHAR(255),
          "hash" VARCHAR(64),
          "previousHash" VARCHAR(64),
          "description" TEXT,
          "metadata" JSONB,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `, { transaction });

      for (const table of ORG_TABLES) {
        await queryInterface.sequelize.query(`
          DO $$
          BEGIN
            IF to_regclass('public."${table}"') IS NOT NULL THEN
              ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "organizationId" VARCHAR(255);
              ALTER TABLE "${table}" ALTER COLUMN "organizationId" TYPE VARCHAR(255) USING "organizationId"::VARCHAR;
              UPDATE "${table}" SET "organizationId" = 'ORG_1' WHERE "organizationId" IS NULL;
              ALTER TABLE "${table}" ALTER COLUMN "organizationId" SET DEFAULT 'ORG_1';
              ALTER TABLE "${table}" ALTER COLUMN "organizationId" SET NOT NULL;
              CREATE INDEX IF NOT EXISTS "${table.toLowerCase()}_org_idx" ON "${table}" ("organizationId");
            END IF;
          END $$;
        `, { transaction });
      }

      await queryInterface.sequelize.query(`
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "accountId" UUID;
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "journalId" UUID;
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "disbursementId" UUID;

        CREATE INDEX IF NOT EXISTS "ledger_account_idx" ON "Ledgers" ("accountId");
        CREATE INDEX IF NOT EXISTS "ledger_journal_idx" ON "Ledgers" ("journalId");
        CREATE INDEX IF NOT EXISTS "ledger_disbursement_idx" ON "Ledgers" ("disbursementId");

        ALTER TABLE "Ledgers" DROP CONSTRAINT IF EXISTS "fk_ledgers_account";
        ALTER TABLE "Ledgers"
          ADD CONSTRAINT "fk_ledgers_account"
          FOREIGN KEY ("accountId") REFERENCES "Accounts"(id) ON DELETE SET NULL;

        ALTER TABLE "Ledgers" DROP CONSTRAINT IF EXISTS "fk_ledgers_journal";
        ALTER TABLE "Ledgers"
          ADD CONSTRAINT "fk_ledgers_journal"
          FOREIGN KEY ("journalId") REFERENCES "JournalEntries"(id) ON DELETE SET NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF to_regclass('public."Disbursements"') IS NOT NULL THEN
            ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "referenceId" VARCHAR(255);

            UPDATE "Disbursements"
            SET "referenceId" = COALESCE(
              NULLIF("referenceId", ''),
              NULLIF("bankReference", ''),
              NULLIF("transactionId", ''),
              NULLIF("chequeNumber", ''),
              "_id"::text
            )
            WHERE "referenceId" IS NULL OR "referenceId" = '';

            WITH duplicate_refs AS (
              SELECT
                "_id",
                "referenceId",
                ROW_NUMBER() OVER (PARTITION BY "referenceId" ORDER BY "createdAt", "_id") AS rn
              FROM "Disbursements"
              WHERE "referenceId" IS NOT NULL AND "referenceId" <> ''
            )
            UPDATE "Disbursements" d
            SET "referenceId" = duplicate_refs."referenceId" || '-' || d."_id"::text
            FROM duplicate_refs
            WHERE d."_id" = duplicate_refs."_id"
              AND duplicate_refs.rn > 1;

            ALTER TABLE "Disbursements" ALTER COLUMN "referenceId" SET NOT NULL;
            CREATE UNIQUE INDEX IF NOT EXISTS "disbursement_reference_unique"
              ON "Disbursements" ("referenceId");

            IF NOT EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'chk_amount_positive'
            ) THEN
              ALTER TABLE "Disbursements"
                ADD CONSTRAINT "chk_amount_positive" CHECK ("amount" > 0);
            END IF;
          END IF;
        END $$;
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "ledger_account_idx";
      DROP INDEX IF EXISTS "ledger_journal_idx";
      DROP INDEX IF EXISTS "ledger_disbursement_idx";
      DROP INDEX IF EXISTS "disbursement_reference_unique";
    `);
  },
};
