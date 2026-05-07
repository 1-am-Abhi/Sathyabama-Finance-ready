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
        UPDATE "Documents" SET "documentType" = 'GENERAL' WHERE "documentType" IS NULL;
        UPDATE "Documents" SET "status" = 'PENDING' WHERE "status" IS NULL;
        UPDATE "Documents" SET "createdAt" = NOW() WHERE "createdAt" IS NULL;
        UPDATE "Documents" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS "documents_uuid_unique" ON "Documents" ("_id");
        CREATE INDEX IF NOT EXISTS "documents_faculty_id_idx" ON "Documents" ("facultyId");
        CREATE INDEX IF NOT EXISTS "documents_status_idx" ON "Documents" ("status");
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE "PFMSTransactions" ADD COLUMN IF NOT EXISTS "_id" UUID DEFAULT gen_random_uuid();
        UPDATE "PFMSTransactions" SET "_id" = gen_random_uuid() WHERE "_id" IS NULL;
        ALTER TABLE "PFMSTransactions" ALTER COLUMN "_id" SET DEFAULT gen_random_uuid();
        ALTER TABLE "PFMSTransactions" ALTER COLUMN "_id" SET NOT NULL;
        ALTER TABLE "PFMSTransactions" ADD COLUMN IF NOT EXISTS "projectId" UUID;
        ALTER TABLE "PFMSTransactions" ADD COLUMN IF NOT EXISTS "pfmsProjectId" VARCHAR(255);
        ALTER TABLE "PFMSTransactions" ADD COLUMN IF NOT EXISTS "govtOrganization" VARCHAR(255);
        ALTER TABLE "PFMSTransactions" ADD COLUMN IF NOT EXISTS "sanctionOrderNo" VARCHAR(255);
        ALTER TABLE "PFMSTransactions" ADD COLUMN IF NOT EXISTS "sanctionOrderDate" DATE;
        ALTER TABLE "PFMSTransactions" ADD COLUMN IF NOT EXISTS "installmentNumber" INTEGER DEFAULT 1;
        ALTER TABLE "PFMSTransactions" ADD COLUMN IF NOT EXISTS "amountReleased" DECIMAL(15,2);
        ALTER TABLE "PFMSTransactions" ADD COLUMN IF NOT EXISTS "creditDate" DATE;
        ALTER TABLE "PFMSTransactions" ADD COLUMN IF NOT EXISTS "utrNumber" VARCHAR(255);
        ALTER TABLE "PFMSTransactions" ADD COLUMN IF NOT EXISTS "ucStatus" VARCHAR(255) DEFAULT 'PENDING';
        ALTER TABLE "PFMSTransactions" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE "PFMSTransactions" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
        UPDATE "PFMSTransactions" SET "installmentNumber" = 1 WHERE "installmentNumber" IS NULL;
        UPDATE "PFMSTransactions" SET "ucStatus" = 'PENDING' WHERE "ucStatus" IS NULL;
        UPDATE "PFMSTransactions" SET "createdAt" = NOW() WHERE "createdAt" IS NULL;
        UPDATE "PFMSTransactions" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS "pfms_transactions_uuid_unique" ON "PFMSTransactions" ("_id");
        CREATE INDEX IF NOT EXISTS "pfms_transactions_project_id_idx" ON "PFMSTransactions" ("projectId");
        CREATE INDEX IF NOT EXISTS "pfms_transactions_utr_idx" ON "PFMSTransactions" ("utrNumber");
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "_id" UUID DEFAULT gen_random_uuid();
        UPDATE "Disbursements" SET "_id" = gen_random_uuid() WHERE "_id" IS NULL;
        ALTER TABLE "Disbursements" ALTER COLUMN "_id" SET DEFAULT gen_random_uuid();
        ALTER TABLE "Disbursements" ALTER COLUMN "_id" SET NOT NULL;
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "fundRequestId" UUID;
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "projectId" UUID;
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "organizationId" VARCHAR(255) DEFAULT 'ORG_1';
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "disbursedAt" TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "referenceId" VARCHAR(255);
        ALTER TABLE "Disbursements" ADD COLUMN IF NOT EXISTS "status" VARCHAR(255) DEFAULT 'COMPLETED';
        UPDATE "Disbursements" SET "organizationId" = 'ORG_1' WHERE "organizationId" IS NULL;
        UPDATE "Disbursements" SET "status" = 'COMPLETED' WHERE "status" IS NULL;
        UPDATE "Disbursements" SET "disbursedAt" = COALESCE("createdAt", NOW()) WHERE "disbursedAt" IS NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'Disbursements'
              AND column_name = 'requestId'
          ) THEN
            UPDATE "Disbursements"
            SET "fundRequestId" = "requestId"
            WHERE "fundRequestId" IS NULL AND "requestId" IS NOT NULL;
          END IF;
        END $$;

        UPDATE "Disbursements" d
        SET "projectId" = fr."projectId"
        FROM "FundRequests" fr
        WHERE d."projectId" IS NULL
          AND d."fundRequestId" = fr."_id"
          AND fr."projectId" IS NOT NULL;

        UPDATE "Disbursements"
        SET "referenceId" = COALESCE(NULLIF("referenceId", ''), "_id"::text)
        WHERE "referenceId" IS NULL OR "referenceId" = '';

        CREATE UNIQUE INDEX IF NOT EXISTS "disbursements_uuid_unique" ON "Disbursements" ("_id");
        CREATE INDEX IF NOT EXISTS "idx_disbursements_fund_request_id" ON "Disbursements" ("fundRequestId");
        CREATE INDEX IF NOT EXISTS "idx_disbursements_project_id" ON "Disbursements" ("projectId");
        CREATE INDEX IF NOT EXISTS "idx_disbursements_disbursed_at" ON "Disbursements" ("disbursedAt");
        CREATE INDEX IF NOT EXISTS "idx_disbursements_status" ON "Disbursements" ("status");
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS "projects_uuid_unique" ON "Projects" ("_id");
        CREATE UNIQUE INDEX IF NOT EXISTS "fund_requests_uuid_unique" ON "FundRequests" ("_id");
        CREATE UNIQUE INDEX IF NOT EXISTS "users_uuid_unique" ON "Users" ("_id");
        CREATE UNIQUE INDEX IF NOT EXISTS "research_centers_uuid_unique" ON "ResearchCenters" ("_id");

        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_disbursements_fund_request_uuid') THEN
            ALTER TABLE "Disbursements"
              ADD CONSTRAINT "fk_disbursements_fund_request_uuid"
              FOREIGN KEY ("fundRequestId") REFERENCES "FundRequests"("_id") ON DELETE SET NULL NOT VALID;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_disbursements_project_uuid') THEN
            ALTER TABLE "Disbursements"
              ADD CONSTRAINT "fk_disbursements_project_uuid"
              FOREIGN KEY ("projectId") REFERENCES "Projects"("_id") ON DELETE SET NULL NOT VALID;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_documents_faculty_uuid') THEN
            ALTER TABLE "Documents"
              ADD CONSTRAINT "fk_documents_faculty_uuid"
              FOREIGN KEY ("facultyId") REFERENCES "Users"("_id") ON DELETE CASCADE NOT VALID;
          END IF;

          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_pfms_transactions_project_uuid') THEN
            ALTER TABLE "PFMSTransactions"
              ADD CONSTRAINT "fk_pfms_transactions_project_uuid"
              FOREIGN KEY ("projectId") REFERENCES "Projects"("_id") ON DELETE CASCADE NOT VALID;
          END IF;
        END $$;
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE "Disbursements" DROP CONSTRAINT IF EXISTS "fk_disbursements_fund_request_uuid";
        ALTER TABLE "Disbursements" DROP CONSTRAINT IF EXISTS "fk_disbursements_project_uuid";
        ALTER TABLE "Documents" DROP CONSTRAINT IF EXISTS "fk_documents_faculty_uuid";
        ALTER TABLE "PFMSTransactions" DROP CONSTRAINT IF EXISTS "fk_pfms_transactions_project_uuid";
        DROP INDEX IF EXISTS "idx_disbursements_status";
      `, { transaction });
    });
  },
};
