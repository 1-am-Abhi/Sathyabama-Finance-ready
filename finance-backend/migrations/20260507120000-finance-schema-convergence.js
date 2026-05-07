'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', { transaction });

      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "Documents" (
          "_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "facultyId" UUID NOT NULL,
          "facultyName" VARCHAR(255),
          "fileName" VARCHAR(255) NOT NULL,
          "fileType" VARCHAR(255),
          "documentType" VARCHAR(255) DEFAULT 'GENERAL',
          "projectName" VARCHAR(255),
          "description" TEXT,
          "fileData" TEXT,
          "status" VARCHAR(255) DEFAULT 'PENDING',
          "adminRemarks" VARCHAR(255),
          "verifiedAt" TIMESTAMPTZ,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "AccountingPeriods" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "startDate" DATE NOT NULL,
          "endDate" DATE NOT NULL,
          "status" VARCHAR(255) DEFAULT 'OPEN',
          "closedAt" TIMESTAMPTZ,
          "closedBy" UUID,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "LedgerSnapshots" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "snapshotName" VARCHAR(255) NOT NULL,
          "lastLedgerId" UUID NOT NULL,
          "lastHash" VARCHAR(64) NOT NULL,
          "totalEntries" INTEGER NOT NULL,
          "totalDebit" DECIMAL(15,2) NOT NULL,
          "totalCredit" DECIMAL(15,2) NOT NULL,
          "metadata" JSONB,
          "snapshotBy" UUID,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "AuditLogs" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" UUID,
          "action" VARCHAR(255) NOT NULL,
          "entityType" VARCHAR(255) NOT NULL,
          "entityId" VARCHAR(255) NOT NULL,
          "organizationId" VARCHAR(255),
          "metadata" JSONB,
          "hash" VARCHAR(255),
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "PFMSTransactions" (
          "_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "projectId" UUID NOT NULL,
          "pfmsProjectId" VARCHAR(255) NOT NULL,
          "govtOrganization" VARCHAR(255) NOT NULL,
          "sanctionOrderNo" VARCHAR(255) NOT NULL,
          "sanctionOrderDate" DATE NOT NULL,
          "installmentNumber" INTEGER DEFAULT 1,
          "amountReleased" DECIMAL(15,2) NOT NULL,
          "creditDate" DATE NOT NULL,
          "utrNumber" VARCHAR(255) NOT NULL,
          "ucStatus" VARCHAR(255) DEFAULT 'PENDING',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "_id" UUID DEFAULT gen_random_uuid();
        UPDATE "Documents" SET "_id" = gen_random_uuid() WHERE "_id" IS NULL;
        ALTER TABLE "Documents" ALTER COLUMN "_id" SET DEFAULT gen_random_uuid();
        ALTER TABLE "Documents" ALTER COLUMN "_id" SET NOT NULL;
        ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "facultyId" UUID;
        ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "facultyName" VARCHAR(255);
        ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "fileName" VARCHAR(255);
        ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "fileType" VARCHAR(255);
        ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "documentType" VARCHAR(255) DEFAULT 'GENERAL';
        ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "projectName" VARCHAR(255);
        ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "description" TEXT;
        ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "fileData" TEXT;
        ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "status" VARCHAR(255) DEFAULT 'PENDING';
        ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "adminRemarks" VARCHAR(255);
        ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMPTZ;
        ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE "Documents" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
        CREATE UNIQUE INDEX IF NOT EXISTS "documents_uuid_unique" ON "Documents" ("_id");
        CREATE INDEX IF NOT EXISTS "documents_faculty_id_idx" ON "Documents" ("facultyId");
        CREATE INDEX IF NOT EXISTS "documents_status_idx" ON "Documents" ("status");
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE "Accounts" ADD COLUMN IF NOT EXISTS "description" TEXT;
        ALTER TABLE "Accounts" ADD COLUMN IF NOT EXISTS "organizationId" VARCHAR(255) DEFAULT 'ORG_1';
        UPDATE "Accounts" SET "organizationId" = 'ORG_1' WHERE "organizationId" IS NULL;
        ALTER TABLE "Accounts" ALTER COLUMN "organizationId" SET DEFAULT 'ORG_1';
        CREATE INDEX IF NOT EXISTS "accounts_org_idx" ON "Accounts" ("organizationId");

        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'Accounts'
              AND column_name = 'id'
              AND data_type = 'uuid'
          ) THEN
            UPDATE "Accounts" SET "id" = gen_random_uuid() WHERE "id" IS NULL;
            ALTER TABLE "Accounts" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
            ALTER TABLE "Accounts" ALTER COLUMN "id" SET NOT NULL;
          END IF;
        END $$;
      `, { transaction });

      await queryInterface.sequelize.query(`
        DO $$
        DECLARE
          target_table text;
        BEGIN
          FOREACH target_table IN ARRAY ARRAY['Projects', 'FundRequests'] LOOP
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS "_id" UUID DEFAULT gen_random_uuid()', target_table);
            EXECUTE format('UPDATE %I SET "_id" = gen_random_uuid() WHERE "_id" IS NULL', target_table);
            EXECUTE format('ALTER TABLE %I ALTER COLUMN "_id" SET DEFAULT gen_random_uuid()', target_table);
            EXECUTE format('ALTER TABLE %I ALTER COLUMN "_id" SET NOT NULL', target_table);

            IF EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = current_schema()
                AND table_name = target_table
                AND column_name = 'id'
                AND data_type = 'uuid'
            ) THEN
              EXECUTE format('UPDATE %I SET "id" = gen_random_uuid() WHERE "id" IS NULL', target_table);
              EXECUTE format('ALTER TABLE %I ALTER COLUMN "id" SET DEFAULT gen_random_uuid()', target_table);
            END IF;
          END LOOP;
        END $$;

        CREATE UNIQUE INDEX IF NOT EXISTS "projects_uuid_unique" ON "Projects" ("_id");
        CREATE UNIQUE INDEX IF NOT EXISTS "fund_requests_uuid_unique" ON "FundRequests" ("_id");
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "_id" UUID DEFAULT gen_random_uuid();
        UPDATE "Disbursements" SET "_id" = gen_random_uuid() WHERE "_id" IS NULL;
        ALTER TABLE "Disbursements" ALTER COLUMN "_id" SET DEFAULT gen_random_uuid();
        ALTER TABLE "Disbursements" ALTER COLUMN "_id" SET NOT NULL;

        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'Disbursements'
              AND column_name = 'id'
              AND data_type = 'uuid'
          ) THEN
            UPDATE "Disbursements" SET "id" = gen_random_uuid() WHERE "id" IS NULL;
            ALTER TABLE "Disbursements" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
          END IF;
        END $$;

        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "fundRequestId" UUID;
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "projectId" UUID;
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "organizationId" VARCHAR(255) DEFAULT 'ORG_1';
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(15,2);
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "installmentNumber" INTEGER DEFAULT 1;
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "isInstallment" BOOLEAN DEFAULT TRUE;
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "approvedBy" UUID;
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "approvedByName" VARCHAR(255);
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMPTZ;
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "isHighValue" BOOLEAN DEFAULT FALSE;
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "disbursedBy" UUID;
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "disbursedByName" VARCHAR(255);
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "disbursedAt" TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "bankReference" VARCHAR(255);
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "referenceId" VARCHAR(255);
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "chequeNumber" VARCHAR(255);
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "bankName" VARCHAR(255);
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "transactionId" VARCHAR(255);
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "proofUrl" VARCHAR(255);
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "paymentMode" VARCHAR(255) DEFAULT 'CHEQUE';
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(255);
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();

        UPDATE "Disbursements" SET "organizationId" = 'ORG_1' WHERE "organizationId" IS NULL;
        UPDATE "Disbursements" SET "installmentNumber" = 1 WHERE "installmentNumber" IS NULL;
        UPDATE "Disbursements" SET "isInstallment" = TRUE WHERE "isInstallment" IS NULL;
        UPDATE "Disbursements" SET "isHighValue" = FALSE WHERE "isHighValue" IS NULL;
        UPDATE "Disbursements" SET "paymentMode" = 'CHEQUE' WHERE "paymentMode" IS NULL OR "paymentMode" = '';
        UPDATE "Disbursements" SET "createdAt" = NOW() WHERE "createdAt" IS NULL;
        UPDATE "Disbursements" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;

        ALTER TABLE "Disbursements" ALTER COLUMN "amount" TYPE DECIMAL(15,2) USING "amount"::DECIMAL(15,2);
        ALTER TABLE "Disbursements" ALTER COLUMN "organizationId" SET DEFAULT 'ORG_1';
        ALTER TABLE "Disbursements" ALTER COLUMN "organizationId" SET NOT NULL;
        ALTER TABLE "Disbursements" ALTER COLUMN "installmentNumber" SET DEFAULT 1;
        ALTER TABLE "Disbursements" ALTER COLUMN "installmentNumber" SET NOT NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
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
            "_id" AS pk,
            "referenceId",
            ROW_NUMBER() OVER (
              PARTITION BY "referenceId"
              ORDER BY "createdAt", "_id"
            ) AS rn
          FROM "Disbursements"
          WHERE "referenceId" IS NOT NULL AND "referenceId" <> ''
        )
        UPDATE "Disbursements" d
        SET "referenceId" = duplicate_refs."referenceId" || '-' || d."_id"::text
        FROM duplicate_refs
        WHERE d."_id" = duplicate_refs.pk
          AND duplicate_refs.rn > 1;

        ALTER TABLE "Disbursements" ALTER COLUMN "referenceId" SET NOT NULL;

        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'chk_disbursements_amount_positive'
          ) THEN
            ALTER TABLE "Disbursements"
              ADD CONSTRAINT "chk_disbursements_amount_positive"
              CHECK ("amount" > 0);
          END IF;
        END $$;

        CREATE UNIQUE INDEX IF NOT EXISTS "disbursements_uuid_unique" ON "Disbursements" ("_id");
        CREATE UNIQUE INDEX IF NOT EXISTS "unique_reference_id" ON "Disbursements" ("referenceId");
        CREATE UNIQUE INDEX IF NOT EXISTS "unique_disbursement_idempotency_key"
          ON "Disbursements" ("idempotencyKey")
          WHERE "idempotencyKey" IS NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS "unique_disbursement_cheque_number"
          ON "Disbursements" ("chequeNumber")
          WHERE "chequeNumber" IS NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS "unique_disbursement_transaction_id"
          ON "Disbursements" ("transactionId")
          WHERE "transactionId" IS NOT NULL;
        CREATE INDEX IF NOT EXISTS "idx_disbursements_project_id" ON "Disbursements" ("projectId");
        CREATE INDEX IF NOT EXISTS "idx_disbursements_fund_request_id" ON "Disbursements" ("fundRequestId");
        CREATE INDEX IF NOT EXISTS "idx_disbursements_fund_request_installment_number"
          ON "Disbursements" ("fundRequestId", "installmentNumber");
        CREATE INDEX IF NOT EXISTS "idx_disbursements_disbursed_at" ON "Disbursements" ("disbursedAt");
        CREATE INDEX IF NOT EXISTS "idx_disbursements_org" ON "Disbursements" ("organizationId");
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "id" UUID DEFAULT gen_random_uuid();
        UPDATE "Ledgers" SET "id" = gen_random_uuid() WHERE "id" IS NULL;
        ALTER TABLE "Ledgers" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
        ALTER TABLE "Ledgers" ALTER COLUMN "id" SET NOT NULL;
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
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "hash" VARCHAR(64);
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "previousHash" VARCHAR(64);
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "description" TEXT;
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "referenceId" VARCHAR(255);
        ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();

        UPDATE "Ledgers" SET "debit" = 0 WHERE "debit" IS NULL;
        UPDATE "Ledgers" SET "credit" = 0 WHERE "credit" IS NULL;
        UPDATE "Ledgers" SET "createdAt" = NOW() WHERE "createdAt" IS NULL;
        ALTER TABLE "Ledgers" ALTER COLUMN "debit" TYPE DECIMAL(15,2) USING "debit"::DECIMAL(15,2);
        ALTER TABLE "Ledgers" ALTER COLUMN "credit" TYPE DECIMAL(15,2) USING "credit"::DECIMAL(15,2);
        ALTER TABLE "Ledgers" ALTER COLUMN "debit" SET DEFAULT 0.00;
        ALTER TABLE "Ledgers" ALTER COLUMN "credit" SET DEFAULT 0.00;
        ALTER TABLE "Ledgers" ALTER COLUMN "createdAt" SET DEFAULT NOW();

        ALTER TABLE "Ledgers" DROP CONSTRAINT IF EXISTS "fk_ledgers_account";
        ALTER TABLE "Ledgers"
          ADD CONSTRAINT "fk_ledgers_account"
          FOREIGN KEY ("accountId") REFERENCES "Accounts"("id") ON DELETE SET NULL NOT VALID;

        ALTER TABLE "Ledgers" DROP CONSTRAINT IF EXISTS "fk_ledgers_journal";
        ALTER TABLE "Ledgers"
          ADD CONSTRAINT "fk_ledgers_journal"
          FOREIGN KEY ("journalId") REFERENCES "JournalEntries"("id") ON DELETE SET NULL NOT VALID;

        CREATE INDEX IF NOT EXISTS "ledgers_journal_id" ON "Ledgers" ("journalId");
        CREATE INDEX IF NOT EXISTS "ledgers_account_id" ON "Ledgers" ("accountId");
        CREATE INDEX IF NOT EXISTS "ledgers_project_id" ON "Ledgers" ("projectId");
        CREATE INDEX IF NOT EXISTS "ledgers_fund_request_id" ON "Ledgers" ("fundRequestId");
        CREATE INDEX IF NOT EXISTS "idx_ledger_disbursement" ON "Ledgers" ("disbursementId");
        CREATE INDEX IF NOT EXISTS "ledgers_revenue_id" ON "Ledgers" ("revenueId");
        CREATE INDEX IF NOT EXISTS "ledgers_created_by_user_id" ON "Ledgers" ("createdByUserId");
        CREATE INDEX IF NOT EXISTS "ledgers_hash" ON "Ledgers" ("hash");
        CREATE INDEX IF NOT EXISTS "ledgers_created_at" ON "Ledgers" ("createdAt");
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS "audit_logs_user_id_idx" ON "AuditLogs" ("userId");
        CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "AuditLogs" ("entityType", "entityId");
        CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "AuditLogs" ("createdAt");
        CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity_action" ON "AuditLogs" ("entityId", "action");
        CREATE INDEX IF NOT EXISTS "pfms_transactions_project_id_idx" ON "PFMSTransactions" ("projectId");
        CREATE INDEX IF NOT EXISTS "pfms_transactions_utr_idx" ON "PFMSTransactions" ("utrNumber");
        CREATE INDEX IF NOT EXISTS "accounting_periods_range_idx" ON "AccountingPeriods" ("startDate", "endDate");
        CREATE INDEX IF NOT EXISTS "ledger_snapshots_created_at_idx" ON "LedgerSnapshots" ("createdAt");
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "ledger_snapshots_created_at_idx";
      DROP INDEX IF EXISTS "accounting_periods_range_idx";
      DROP INDEX IF EXISTS "pfms_transactions_utr_idx";
      DROP INDEX IF EXISTS "pfms_transactions_project_id_idx";
      DROP INDEX IF EXISTS "documents_status_idx";
      DROP INDEX IF EXISTS "documents_faculty_id_idx";
    `);
  },
};
