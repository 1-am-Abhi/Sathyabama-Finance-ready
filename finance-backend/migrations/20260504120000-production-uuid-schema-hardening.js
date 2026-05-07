'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', { transaction });

      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF to_regclass('"Users"') IS NULL THEN
            CREATE TABLE "Users" (
              "id" SERIAL PRIMARY KEY,
              "_id" UUID NOT NULL DEFAULT gen_random_uuid(),
              "name" VARCHAR(255) NOT NULL,
              "email" VARCHAR(255) NOT NULL,
              "password" VARCHAR(255) NOT NULL,
              "role" VARCHAR(255) NOT NULL DEFAULT 'FINANCE_OFFICER',
              "organizationId" VARCHAR(255) NOT NULL DEFAULT 'ORG_1',
              "department" VARCHAR(255),
              "centre" VARCHAR(255),
              "centreId" UUID,
              "researchCenterId" UUID,
              "designation" VARCHAR(255),
              "employeeId" VARCHAR(255),
              "joiningDate" DATE,
              "phone" VARCHAR(255),
              "officeLocation" VARCHAR(255),
              "specialization" TEXT,
              "scopusId" VARCHAR(255),
              "designationCategory" VARCHAR(255) NOT NULL DEFAULT 'FACULTY',
              "bio" TEXT,
              "education" JSONB NOT NULL DEFAULT '[]'::jsonb,
              "achievements" JSONB NOT NULL DEFAULT '[]'::jsonb,
              "photo" TEXT,
              "isProfileCompleted" BOOLEAN NOT NULL DEFAULT FALSE,
              "status" VARCHAR(255) NOT NULL DEFAULT 'Active',
              "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
          END IF;

          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "_id" UUID DEFAULT gen_random_uuid();
          UPDATE "Users" SET "_id" = gen_random_uuid() WHERE "_id" IS NULL;
          ALTER TABLE "Users" ALTER COLUMN "_id" SET DEFAULT gen_random_uuid();
          ALTER TABLE "Users" ALTER COLUMN "_id" SET NOT NULL;
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "password" VARCHAR(255);
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "organizationId" VARCHAR(255) DEFAULT 'ORG_1';
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "department" VARCHAR(255);
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "centre" VARCHAR(255);
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "centreId" UUID;
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "researchCenterId" UUID;
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "designation" VARCHAR(255);
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "employeeId" VARCHAR(255);
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "joiningDate" DATE;
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "phone" VARCHAR(255);
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "officeLocation" VARCHAR(255);
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "specialization" TEXT;
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "scopusId" VARCHAR(255);
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "designationCategory" VARCHAR(255) DEFAULT 'FACULTY';
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "bio" TEXT;
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "education" JSONB DEFAULT '[]'::jsonb;
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "achievements" JSONB DEFAULT '[]'::jsonb;
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "photo" TEXT;
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "isProfileCompleted" BOOLEAN DEFAULT FALSE;
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "status" VARCHAR(255) DEFAULT 'Active';
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
          ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
          UPDATE "Users" SET "organizationId" = 'ORG_1' WHERE "organizationId" IS NULL;
          UPDATE "Users" SET "designationCategory" = 'FACULTY' WHERE "designationCategory" IS NULL;
          UPDATE "Users" SET "education" = '[]'::jsonb WHERE "education" IS NULL;
          UPDATE "Users" SET "achievements" = '[]'::jsonb WHERE "achievements" IS NULL;
          UPDATE "Users" SET "isProfileCompleted" = FALSE WHERE "isProfileCompleted" IS NULL;
          UPDATE "Users" SET "status" = 'Active' WHERE "status" IS NULL;
          ALTER TABLE "Users" ALTER COLUMN "organizationId" SET NOT NULL;
          ALTER TABLE "Users" ALTER COLUMN "designationCategory" SET NOT NULL;
          ALTER TABLE "Users" ALTER COLUMN "education" SET NOT NULL;
          ALTER TABLE "Users" ALTER COLUMN "achievements" SET NOT NULL;
          ALTER TABLE "Users" ALTER COLUMN "isProfileCompleted" SET NOT NULL;
          ALTER TABLE "Users" ALTER COLUMN "status" SET NOT NULL;
        END $$;

        CREATE UNIQUE INDEX IF NOT EXISTS "users_uuid_unique" ON "Users" ("_id");
        CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "Users" (LOWER("email"));
        CREATE INDEX IF NOT EXISTS "users_role_idx" ON "Users" ("role");
        CREATE INDEX IF NOT EXISTS "users_research_center_idx" ON "Users" ("researchCenterId");
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "ResearchCenters" (
          "_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "name" VARCHAR(255) NOT NULL UNIQUE,
          "code" VARCHAR(255) UNIQUE,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS "FundSources" (
          "sourceType" VARCHAR(255) PRIMARY KEY,
          "totalAllocated" DOUBLE PRECISION DEFAULT 0,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE "FundSources" ADD COLUMN IF NOT EXISTS "sourceType" VARCHAR(255);
        ALTER TABLE "FundSources" ADD COLUMN IF NOT EXISTS "totalAllocated" DOUBLE PRECISION DEFAULT 0;
        ALTER TABLE "FundSources" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE "FundSources" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
      `, { transaction });

      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF to_regclass('"Projects"') IS NULL THEN
            CREATE TABLE "Projects" (
              "_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              "title" VARCHAR(255) NOT NULL,
              "organizationId" VARCHAR(255) NOT NULL DEFAULT 'ORG_1',
              "userId" UUID,
              "facultyId" UUID,
              "description" TEXT NOT NULL DEFAULT '',
              "pi" VARCHAR(255) NOT NULL DEFAULT 'Unknown',
              "department" VARCHAR(255) NOT NULL DEFAULT 'RESEARCH',
              "centre" VARCHAR(255),
              "researchCentre" VARCHAR(255) NOT NULL DEFAULT 'General',
              "centreId" UUID,
              "researchCenterId" UUID,
              "sanctionedBudget" DOUBLE PRECISION NOT NULL DEFAULT 0,
              "releasedBudget" DOUBLE PRECISION DEFAULT 0,
              "utilizedBudget" DOUBLE PRECISION DEFAULT 0,
              "status" VARCHAR(255) DEFAULT 'PENDING',
              "projectType" VARCHAR(255) DEFAULT 'PROJECT',
              "publisher" VARCHAR(255),
              "publicationYear" INTEGER,
              "fundingSource" VARCHAR(255) NOT NULL DEFAULT 'INSTITUTIONAL',
              "verificationScreenshot" TEXT,
              "startDate" TIMESTAMPTZ,
              "endDate" TIMESTAMPTZ,
              "proofUploaded" BOOLEAN DEFAULT FALSE,
              "proofStatus" VARCHAR(255) DEFAULT 'PENDING',
              "proofRemarks" TEXT,
              "proofData" TEXT,
              "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
          END IF;

          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "_id" UUID DEFAULT gen_random_uuid();
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'Projects' AND column_name = 'id' AND data_type = 'uuid'
          ) THEN
            UPDATE "Projects" SET "_id" = COALESCE("_id", "id"::uuid) WHERE "_id" IS NULL;
          END IF;
          UPDATE "Projects" SET "_id" = gen_random_uuid() WHERE "_id" IS NULL;
          ALTER TABLE "Projects" ALTER COLUMN "_id" SET DEFAULT gen_random_uuid();
          ALTER TABLE "Projects" ALTER COLUMN "_id" SET NOT NULL;
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "organizationId" VARCHAR(255) DEFAULT 'ORG_1';
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "userId" UUID;
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "facultyId" UUID;
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "description" TEXT DEFAULT '';
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "pi" VARCHAR(255) DEFAULT 'Unknown';
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "department" VARCHAR(255) DEFAULT 'RESEARCH';
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "centre" VARCHAR(255);
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "researchCentre" VARCHAR(255) DEFAULT 'General';
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "centreId" UUID;
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "researchCenterId" UUID;
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "sanctionedBudget" DOUBLE PRECISION DEFAULT 0;
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "releasedBudget" DOUBLE PRECISION DEFAULT 0;
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "utilizedBudget" DOUBLE PRECISION DEFAULT 0;
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "projectType" VARCHAR(255) DEFAULT 'PROJECT';
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "publisher" VARCHAR(255);
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "publicationYear" INTEGER;
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "fundingSource" VARCHAR(255) DEFAULT 'INSTITUTIONAL';
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "verificationScreenshot" TEXT;
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMPTZ;
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMPTZ;
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "proofUploaded" BOOLEAN DEFAULT FALSE;
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "proofStatus" VARCHAR(255) DEFAULT 'PENDING';
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "proofRemarks" TEXT;
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "proofData" TEXT;
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
          ALTER TABLE "Projects" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
          UPDATE "Projects" SET "organizationId" = 'ORG_1' WHERE "organizationId" IS NULL;
          UPDATE "Projects" SET "description" = '' WHERE "description" IS NULL;
          UPDATE "Projects" SET "pi" = 'Unknown' WHERE "pi" IS NULL;
          UPDATE "Projects" SET "department" = 'RESEARCH' WHERE "department" IS NULL;
          UPDATE "Projects" SET "researchCentre" = 'General' WHERE "researchCentre" IS NULL;
          UPDATE "Projects" SET "fundingSource" = 'INSTITUTIONAL' WHERE "fundingSource" IS NULL;
        END $$;

        CREATE UNIQUE INDEX IF NOT EXISTS "projects_uuid_unique" ON "Projects" ("_id");
        CREATE INDEX IF NOT EXISTS "projects_faculty_id_idx" ON "Projects" ("facultyId");
        CREATE INDEX IF NOT EXISTS "projects_user_id_idx" ON "Projects" ("userId");
        CREATE INDEX IF NOT EXISTS "projects_research_center_idx" ON "Projects" ("researchCenterId");
        CREATE INDEX IF NOT EXISTS "projects_org_status_idx" ON "Projects" ("organizationId", "status");
      `, { transaction });

      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF to_regclass('"FundRequests"') IS NULL THEN
            CREATE TABLE "FundRequests" (
              "_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
              "projectTitle" VARCHAR(255) NOT NULL,
              "organizationId" VARCHAR(255) NOT NULL DEFAULT 'ORG_1',
              "projectId" UUID,
              "faculty" VARCHAR(255) NOT NULL DEFAULT 'Unknown',
              "userId" UUID,
              "facultyId" UUID,
              "requestedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
              "installmentNumber" INTEGER NOT NULL DEFAULT 1,
              "type" VARCHAR(255) NOT NULL DEFAULT 'INSTALLMENT',
              "purpose" TEXT NOT NULL DEFAULT '',
              "status" VARCHAR(255) DEFAULT 'PENDING',
              "currentStage" VARCHAR(255),
              "chequeStatus" VARCHAR(255) DEFAULT 'Pending',
              "department" VARCHAR(255) NOT NULL DEFAULT 'RESEARCH',
              "centre" VARCHAR(255),
              "centreId" UUID,
              "researchCenterId" UUID,
              "source" VARCHAR(255) NOT NULL DEFAULT 'INSTITUTIONAL',
              "majorEquipments" DOUBLE PRECISION DEFAULT 0,
              "minorEquipments" DOUBLE PRECISION DEFAULT 0,
              "consumables" DOUBLE PRECISION DEFAULT 0,
              "services" DOUBLE PRECISION DEFAULT 0,
              "amc" DOUBLE PRECISION DEFAULT 0,
              "documents" JSONB DEFAULT '[]'::jsonb,
              "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
              "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
          END IF;

          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "_id" UUID DEFAULT gen_random_uuid();
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'FundRequests' AND column_name = 'id' AND data_type = 'uuid'
          ) THEN
            UPDATE "FundRequests" SET "_id" = COALESCE("_id", "id"::uuid) WHERE "_id" IS NULL;
          END IF;
          UPDATE "FundRequests" SET "_id" = gen_random_uuid() WHERE "_id" IS NULL;
          ALTER TABLE "FundRequests" ALTER COLUMN "_id" SET DEFAULT gen_random_uuid();
          ALTER TABLE "FundRequests" ALTER COLUMN "_id" SET NOT NULL;
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "projectTitle" VARCHAR(255);
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "organizationId" VARCHAR(255) DEFAULT 'ORG_1';
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "projectId" UUID;
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "faculty" VARCHAR(255) DEFAULT 'Unknown';
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "userId" UUID;
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "facultyId" UUID;
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "requestedAmount" DOUBLE PRECISION DEFAULT 0;
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "installmentNumber" INTEGER DEFAULT 1;
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "type" VARCHAR(255) DEFAULT 'INSTALLMENT';
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "purpose" TEXT DEFAULT '';
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "status" VARCHAR(255) DEFAULT 'PENDING';
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "currentStage" VARCHAR(255);
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "chequeStatus" VARCHAR(255) DEFAULT 'Pending';
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "department" VARCHAR(255) DEFAULT 'RESEARCH';
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "centre" VARCHAR(255);
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "centreId" UUID;
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "researchCenterId" UUID;
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "source" VARCHAR(255) DEFAULT 'INSTITUTIONAL';
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "majorEquipments" DOUBLE PRECISION DEFAULT 0;
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "minorEquipments" DOUBLE PRECISION DEFAULT 0;
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "consumables" DOUBLE PRECISION DEFAULT 0;
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "services" DOUBLE PRECISION DEFAULT 0;
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "amc" DOUBLE PRECISION DEFAULT 0;
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "documents" JSONB DEFAULT '[]'::jsonb;
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
          ALTER TABLE "FundRequests" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'FundRequests' AND column_name = 'title'
          ) THEN
            UPDATE "FundRequests" SET "projectTitle" = COALESCE("projectTitle", "title", 'Untitled Request') WHERE "projectTitle" IS NULL;
          ELSE
            UPDATE "FundRequests" SET "projectTitle" = COALESCE("projectTitle", 'Untitled Request') WHERE "projectTitle" IS NULL;
          END IF;
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema() AND table_name = 'FundRequests' AND column_name = 'amount'
          ) THEN
            UPDATE "FundRequests" SET "requestedAmount" = COALESCE("requestedAmount", "amount", 0) WHERE "requestedAmount" IS NULL;
          ELSE
            UPDATE "FundRequests" SET "requestedAmount" = COALESCE("requestedAmount", 0) WHERE "requestedAmount" IS NULL;
          END IF;
          UPDATE "FundRequests" SET "organizationId" = 'ORG_1' WHERE "organizationId" IS NULL;
          UPDATE "FundRequests" SET "faculty" = 'Unknown' WHERE "faculty" IS NULL;
          UPDATE "FundRequests" SET "purpose" = '' WHERE "purpose" IS NULL;
          UPDATE "FundRequests" SET "department" = 'RESEARCH' WHERE "department" IS NULL;
          UPDATE "FundRequests" SET "source" = 'INSTITUTIONAL' WHERE "source" IS NULL;
        END $$;

        CREATE UNIQUE INDEX IF NOT EXISTS "fund_requests_uuid_unique" ON "FundRequests" ("_id");
        CREATE INDEX IF NOT EXISTS "fund_requests_project_id_idx" ON "FundRequests" ("projectId");
        CREATE INDEX IF NOT EXISTS "fund_requests_faculty_id_idx" ON "FundRequests" ("facultyId");
        CREATE INDEX IF NOT EXISTS "fund_requests_user_id_idx" ON "FundRequests" ("userId");
        CREATE INDEX IF NOT EXISTS "fund_requests_status_idx" ON "FundRequests" ("status");
        CREATE INDEX IF NOT EXISTS "fund_requests_stage_idx" ON "FundRequests" ("currentStage");
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "Notifications" (
          "_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" UUID,
          "role" VARCHAR(255),
          "title" VARCHAR(255) NOT NULL,
          "message" VARCHAR(255) NOT NULL,
          "type" VARCHAR(255) DEFAULT 'INFO',
          "relatedId" VARCHAR(255),
          "isRead" BOOLEAN DEFAULT FALSE,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "_id" UUID DEFAULT gen_random_uuid();
        UPDATE "Notifications" SET "_id" = gen_random_uuid() WHERE "_id" IS NULL;
        ALTER TABLE "Notifications" ALTER COLUMN "_id" SET DEFAULT gen_random_uuid();
        ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "userId" UUID;
        ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "role" VARCHAR(255);
        ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "title" VARCHAR(255);
        ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "message" VARCHAR(255);
        ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "type" VARCHAR(255) DEFAULT 'INFO';
        ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "relatedId" VARCHAR(255);
        ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN DEFAULT FALSE;
        ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE "Notifications" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
        CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "Notifications" ("userId");
        CREATE INDEX IF NOT EXISTS "notifications_role_idx" ON "Notifications" ("role");
        CREATE INDEX IF NOT EXISTS "notifications_read_idx" ON "Notifications" ("isRead");
        CREATE INDEX IF NOT EXISTS "notifications_created_at_idx" ON "Notifications" ("createdAt");
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "EventRequests" (
          "_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "facultyId" UUID NOT NULL,
          "organizationId" VARCHAR(255) NOT NULL DEFAULT 'ORG_1',
          "projectId" UUID,
          "facultyName" VARCHAR(255) NOT NULL,
          "department" VARCHAR(255) NOT NULL,
          "researchCentre" VARCHAR(255),
          "eventTitle" VARCHAR(255) NOT NULL,
          "eventType" VARCHAR(255) NOT NULL,
          "venue" VARCHAR(255) NOT NULL,
          "dates" VARCHAR(255) NOT NULL,
          "isFullDay" BOOLEAN DEFAULT TRUE,
          "startTime" VARCHAR(255),
          "endTime" VARCHAR(255),
          "participants" INTEGER DEFAULT 0,
          "internalParticipants" INTEGER DEFAULT 0,
          "externalParticipants" INTEGER DEFAULT 0,
          "fundingType" VARCHAR(255) NOT NULL,
          "fundingSource" VARCHAR(255),
          "approvedAmount" DOUBLE PRECISION,
          "status" VARCHAR(255) DEFAULT 'PENDING',
          "photosUploaded" BOOLEAN DEFAULT FALSE,
          "photoData" TEXT,
          "remarks" TEXT,
          "description" TEXT,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE "EventRequests" ADD COLUMN IF NOT EXISTS "projectId" UUID;
        ALTER TABLE "EventRequests" ADD COLUMN IF NOT EXISTS "organizationId" VARCHAR(255) DEFAULT 'ORG_1';
        ALTER TABLE "EventRequests" ADD COLUMN IF NOT EXISTS "internalParticipants" INTEGER DEFAULT 0;
        ALTER TABLE "EventRequests" ADD COLUMN IF NOT EXISTS "externalParticipants" INTEGER DEFAULT 0;
        ALTER TABLE "EventRequests" ADD COLUMN IF NOT EXISTS "description" TEXT;
        CREATE INDEX IF NOT EXISTS "event_requests_project_id_idx" ON "EventRequests" ("projectId");
        CREATE INDEX IF NOT EXISTS "event_requests_faculty_id_idx" ON "EventRequests" ("facultyId");
        CREATE INDEX IF NOT EXISTS "event_requests_status_idx" ON "EventRequests" ("status");
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "InternshipFees" (
          "_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "studentName" VARCHAR(255) NOT NULL,
          "studentId" VARCHAR(255) NOT NULL,
          "internshipTitle" VARCHAR(255) NOT NULL,
          "feeAmount" DECIMAL(10,2) NOT NULL,
          "paymentStatus" VARCHAR(255) DEFAULT 'PENDING',
          "adminStatus" VARCHAR(255) DEFAULT 'PENDING',
          "adminRemarks" TEXT,
          "paymentMode" VARCHAR(255),
          "receiptNumber" VARCHAR(255),
          "paymentDate" DATE,
          "verifiedBy" UUID,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE "InternshipFees" ADD COLUMN IF NOT EXISTS "_id" UUID DEFAULT gen_random_uuid();
        ALTER TABLE "InternshipFees" ADD COLUMN IF NOT EXISTS "studentName" VARCHAR(255);
        ALTER TABLE "InternshipFees" ADD COLUMN IF NOT EXISTS "studentId" VARCHAR(255);
        ALTER TABLE "InternshipFees" ADD COLUMN IF NOT EXISTS "internshipTitle" VARCHAR(255);
        ALTER TABLE "InternshipFees" ADD COLUMN IF NOT EXISTS "feeAmount" DECIMAL(10,2);
        ALTER TABLE "InternshipFees" ADD COLUMN IF NOT EXISTS "paymentStatus" VARCHAR(255) DEFAULT 'PENDING';
        ALTER TABLE "InternshipFees" ADD COLUMN IF NOT EXISTS "adminStatus" VARCHAR(255) DEFAULT 'PENDING';
        ALTER TABLE "InternshipFees" ADD COLUMN IF NOT EXISTS "adminRemarks" TEXT;
        ALTER TABLE "InternshipFees" ADD COLUMN IF NOT EXISTS "paymentMode" VARCHAR(255);
        ALTER TABLE "InternshipFees" ADD COLUMN IF NOT EXISTS "receiptNumber" VARCHAR(255);
        ALTER TABLE "InternshipFees" ADD COLUMN IF NOT EXISTS "paymentDate" DATE;
        ALTER TABLE "InternshipFees" ADD COLUMN IF NOT EXISTS "verifiedBy" UUID;
        ALTER TABLE "InternshipFees" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE "InternshipFees" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
        CREATE INDEX IF NOT EXISTS "internship_fees_admin_status_idx" ON "InternshipFees" ("adminStatus");
        CREATE INDEX IF NOT EXISTS "internship_fees_payment_status_idx" ON "InternshipFees" ("paymentStatus");
        CREATE INDEX IF NOT EXISTS "internship_fees_verified_by_idx" ON "InternshipFees" ("verifiedBy");

        CREATE TABLE IF NOT EXISTS "Revenues" (
          "_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "userId" UUID NOT NULL,
          "year" INTEGER NOT NULL,
          "revenueSource" VARCHAR(255) NOT NULL,
          "amountGenerated" DECIMAL(15,2) NOT NULL DEFAULT 0,
          "details" TEXT,
          "status" VARCHAR(255) DEFAULT 'PENDING_ADMIN',
          "verifiedAmount" DECIMAL(15,2),
          "bankReference" VARCHAR(255),
          "adminRemarks" TEXT,
          "financeRemarks" TEXT,
          "verifiedAt" TIMESTAMPTZ,
          "verifiedBy" UUID,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE "Revenues" ADD COLUMN IF NOT EXISTS "_id" UUID DEFAULT gen_random_uuid();
        ALTER TABLE "Revenues" ADD COLUMN IF NOT EXISTS "userId" UUID;
        ALTER TABLE "Revenues" ADD COLUMN IF NOT EXISTS "year" INTEGER;
        ALTER TABLE "Revenues" ADD COLUMN IF NOT EXISTS "revenueSource" VARCHAR(255);
        ALTER TABLE "Revenues" ADD COLUMN IF NOT EXISTS "amountGenerated" DECIMAL(15,2) DEFAULT 0;
        ALTER TABLE "Revenues" ADD COLUMN IF NOT EXISTS "details" TEXT;
        ALTER TABLE "Revenues" ADD COLUMN IF NOT EXISTS "status" VARCHAR(255) DEFAULT 'PENDING_ADMIN';
        ALTER TABLE "Revenues" ADD COLUMN IF NOT EXISTS "verifiedAmount" DECIMAL(15,2);
        ALTER TABLE "Revenues" ADD COLUMN IF NOT EXISTS "bankReference" VARCHAR(255);
        ALTER TABLE "Revenues" ADD COLUMN IF NOT EXISTS "adminRemarks" TEXT;
        ALTER TABLE "Revenues" ADD COLUMN IF NOT EXISTS "financeRemarks" TEXT;
        ALTER TABLE "Revenues" ADD COLUMN IF NOT EXISTS "verifiedAt" TIMESTAMPTZ;
        ALTER TABLE "Revenues" ADD COLUMN IF NOT EXISTS "verifiedBy" UUID;
        ALTER TABLE "Revenues" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE "Revenues" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
        CREATE INDEX IF NOT EXISTS "revenues_user_id_idx" ON "Revenues" ("userId");
        CREATE INDEX IF NOT EXISTS "revenues_status_idx" ON "Revenues" ("status");
        CREATE INDEX IF NOT EXISTS "revenues_year_idx" ON "Revenues" ("year");

        CREATE TABLE IF NOT EXISTS "AcademicMetrics" (
          "_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "facultyId" UUID NOT NULL,
          "facultyName" VARCHAR(255),
          "cycle" VARCHAR(255) DEFAULT '2024-25',
          "status" VARCHAR(255) DEFAULT 'APPROVED',
          "remarks" TEXT,
          "theorySubjects" INTEGER DEFAULT 0,
          "practicalSubjects" INTEGER DEFAULT 0,
          "ugProjects" INTEGER DEFAULT 0,
          "pgProjects" INTEGER DEFAULT 0,
          "internships" INTEGER DEFAULT 0,
          "examDuty" INTEGER DEFAULT 0,
          "phdOngoing" INTEGER DEFAULT 0,
          "phdCompleted" INTEGER DEFAULT 0,
          "journals" INTEGER DEFAULT 0,
          "proceedings" INTEGER DEFAULT 0,
          "books" INTEGER DEFAULT 0,
          "bookChapters" INTEGER DEFAULT 0,
          "patents" INTEGER DEFAULT 0,
          "products" INTEGER DEFAULT 0,
          "startups" INTEGER DEFAULT 0,
          "mous" INTEGER DEFAULT 0,
          "editorialRole" INTEGER DEFAULT 0,
          "internationalVisit" INTEGER DEFAULT 0,
          "fellowship" TEXT DEFAULT '',
          "coordinators" TEXT DEFAULT '',
          "grants" TEXT DEFAULT '',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "_id" UUID DEFAULT gen_random_uuid();
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "facultyId" UUID;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "facultyName" VARCHAR(255);
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "cycle" VARCHAR(255) DEFAULT '2024-25';
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "status" VARCHAR(255) DEFAULT 'APPROVED';
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "theorySubjects" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "practicalSubjects" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "ugProjects" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "pgProjects" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "internships" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "examDuty" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "phdOngoing" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "phdCompleted" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "journals" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "proceedings" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "books" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "bookChapters" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "patents" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "products" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "startups" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "mous" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "editorialRole" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "internationalVisit" INTEGER DEFAULT 0;
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "fellowship" TEXT DEFAULT '';
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "coordinators" TEXT DEFAULT '';
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "grants" TEXT DEFAULT '';
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE "AcademicMetrics" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
        CREATE INDEX IF NOT EXISTS "academic_metrics_faculty_id_idx" ON "AcademicMetrics" ("facultyId");
        CREATE INDEX IF NOT EXISTS "academic_metrics_cycle_idx" ON "AcademicMetrics" ("cycle");
        CREATE INDEX IF NOT EXISTS "academic_metrics_status_idx" ON "AcademicMetrics" ("status");
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS "ProjectMembers" (
          "_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "projectId" UUID NOT NULL,
          "userId" UUID NOT NULL,
          "role" VARCHAR(255) DEFAULT 'MEMBER',
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE "ProjectMembers" ADD COLUMN IF NOT EXISTS "_id" UUID DEFAULT gen_random_uuid();
        ALTER TABLE "ProjectMembers" ADD COLUMN IF NOT EXISTS "projectId" UUID;
        ALTER TABLE "ProjectMembers" ADD COLUMN IF NOT EXISTS "userId" UUID;
        ALTER TABLE "ProjectMembers" ADD COLUMN IF NOT EXISTS "role" VARCHAR(255) DEFAULT 'MEMBER';
        ALTER TABLE "ProjectMembers" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE "ProjectMembers" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
        CREATE UNIQUE INDEX IF NOT EXISTS "project_members_project_user_unique" ON "ProjectMembers" ("projectId", "userId");
        CREATE INDEX IF NOT EXISTS "project_members_project_id_idx" ON "ProjectMembers" ("projectId");
        CREATE INDEX IF NOT EXISTS "project_members_user_id_idx" ON "ProjectMembers" ("userId");

        CREATE TABLE IF NOT EXISTS "EquipmentRequests" (
          "_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "facultyId" UUID NOT NULL,
          "facultyName" VARCHAR(255) NOT NULL,
          "projectId" VARCHAR(255),
          "projectName" VARCHAR(255),
          "equipmentName" VARCHAR(255) NOT NULL,
          "quantity" VARCHAR(255),
          "requestType" VARCHAR(255) DEFAULT 'PURCHASED',
          "requestedAmount" DOUBLE PRECISION NOT NULL,
          "approvedAmount" DOUBLE PRECISION,
          "justification" TEXT,
          "status" VARCHAR(255) DEFAULT 'Pending',
          "adminRemarks" VARCHAR(255),
          "billData" TEXT,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE "EquipmentRequests" ADD COLUMN IF NOT EXISTS "_id" UUID DEFAULT gen_random_uuid();
        ALTER TABLE "EquipmentRequests" ADD COLUMN IF NOT EXISTS "facultyId" UUID;
        ALTER TABLE "EquipmentRequests" ADD COLUMN IF NOT EXISTS "facultyName" VARCHAR(255);
        ALTER TABLE "EquipmentRequests" ADD COLUMN IF NOT EXISTS "projectId" VARCHAR(255);
        ALTER TABLE "EquipmentRequests" ADD COLUMN IF NOT EXISTS "projectName" VARCHAR(255);
        ALTER TABLE "EquipmentRequests" ADD COLUMN IF NOT EXISTS "equipmentName" VARCHAR(255);
        ALTER TABLE "EquipmentRequests" ADD COLUMN IF NOT EXISTS "quantity" VARCHAR(255);
        ALTER TABLE "EquipmentRequests" ADD COLUMN IF NOT EXISTS "requestType" VARCHAR(255) DEFAULT 'PURCHASED';
        ALTER TABLE "EquipmentRequests" ADD COLUMN IF NOT EXISTS "requestedAmount" DOUBLE PRECISION;
        ALTER TABLE "EquipmentRequests" ADD COLUMN IF NOT EXISTS "approvedAmount" DOUBLE PRECISION;
        ALTER TABLE "EquipmentRequests" ADD COLUMN IF NOT EXISTS "justification" TEXT;
        ALTER TABLE "EquipmentRequests" ADD COLUMN IF NOT EXISTS "status" VARCHAR(255) DEFAULT 'Pending';
        ALTER TABLE "EquipmentRequests" ADD COLUMN IF NOT EXISTS "adminRemarks" VARCHAR(255);
        ALTER TABLE "EquipmentRequests" ADD COLUMN IF NOT EXISTS "billData" TEXT;
        ALTER TABLE "EquipmentRequests" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE "EquipmentRequests" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
        CREATE INDEX IF NOT EXISTS "equipment_requests_faculty_id_idx" ON "EquipmentRequests" ("facultyId");
        CREATE INDEX IF NOT EXISTS "equipment_requests_status_idx" ON "EquipmentRequests" ("status");

        CREATE TABLE IF NOT EXISTS "ODRequests" (
          "_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "facultyId" UUID NOT NULL,
          "facultyName" VARCHAR(255) NOT NULL,
          "department" VARCHAR(255) NOT NULL,
          "odType" VARCHAR(255) DEFAULT 'ACADEMIC',
          "purpose" TEXT NOT NULL,
          "startDate" DATE NOT NULL,
          "endDate" DATE NOT NULL,
          "days" INTEGER NOT NULL,
          "isFullDay" BOOLEAN DEFAULT TRUE,
          "startTime" VARCHAR(255),
          "endTime" VARCHAR(255),
          "status" VARCHAR(255) DEFAULT 'PENDING',
          "proofUploaded" BOOLEAN DEFAULT FALSE,
          "proofStatus" VARCHAR(255) DEFAULT 'PENDING',
          "proofRemarks" TEXT,
          "remarks" TEXT,
          "proofData" TEXT,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "_id" UUID DEFAULT gen_random_uuid();
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "facultyId" UUID;
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "facultyName" VARCHAR(255);
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "department" VARCHAR(255);
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "odType" VARCHAR(255) DEFAULT 'ACADEMIC';
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "purpose" TEXT;
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "startDate" DATE;
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "endDate" DATE;
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "days" INTEGER;
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "isFullDay" BOOLEAN DEFAULT TRUE;
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "startTime" VARCHAR(255);
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "endTime" VARCHAR(255);
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "status" VARCHAR(255) DEFAULT 'PENDING';
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "proofUploaded" BOOLEAN DEFAULT FALSE;
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "proofStatus" VARCHAR(255) DEFAULT 'PENDING';
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "proofRemarks" TEXT;
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "proofData" TEXT;
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE "ODRequests" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();
        CREATE INDEX IF NOT EXISTS "od_requests_faculty_id_idx" ON "ODRequests" ("facultyId");
        CREATE INDEX IF NOT EXISTS "od_requests_status_idx" ON "ODRequests" ("status");
      `, { transaction });

      await queryInterface.sequelize.query(`
        DO $$
        DECLARE
          col_type text;
        BEGIN
          IF to_regclass('"FacultyRequests"') IS NOT NULL THEN
            ALTER TABLE "FacultyRequests" ADD COLUMN IF NOT EXISTS "createdByLegacy" INTEGER;
            SELECT data_type INTO col_type
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'FacultyRequests'
              AND column_name = 'createdBy';

            IF col_type IN ('integer', 'bigint', 'smallint') THEN
              UPDATE "FacultyRequests" SET "createdByLegacy" = "createdBy" WHERE "createdByLegacy" IS NULL;
              ALTER TABLE "FacultyRequests" ADD COLUMN IF NOT EXISTS "createdByUuid" UUID;
              UPDATE "FacultyRequests" fr
              SET "createdByUuid" = u."_id"
              FROM "Users" u
              WHERE fr."createdByUuid" IS NULL AND fr."createdBy" = u."id";
              ALTER TABLE "FacultyRequests" ALTER COLUMN "createdBy" DROP NOT NULL;
              ALTER TABLE "FacultyRequests" DROP COLUMN IF EXISTS "createdBy";
              ALTER TABLE "FacultyRequests" RENAME COLUMN "createdByUuid" TO "createdBy";
            END IF;

            ALTER TABLE "FacultyRequests" ADD COLUMN IF NOT EXISTS "createdBy" UUID;
            CREATE INDEX IF NOT EXISTS "faculty_requests_created_by_idx" ON "FacultyRequests" ("createdBy");
            CREATE INDEX IF NOT EXISTS "faculty_requests_created_by_legacy_idx" ON "FacultyRequests" ("createdByLegacy");
          END IF;
        END $$;
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION _sist_ensure_uuid_column(target_table text, target_column text)
        RETURNS void AS $$
        DECLARE
          current_type text;
          legacy_column text := target_column || 'Legacy';
        BEGIN
          IF to_regclass(format('%I', target_table)) IS NULL THEN
            RETURN;
          END IF;

          SELECT data_type INTO current_type
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = target_table
            AND column_name = target_column;

          IF current_type IS NULL THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN %I UUID', target_table, target_column);
          ELSIF current_type <> 'uuid' THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS %I TEXT', target_table, legacy_column);
            EXECUTE format('UPDATE %I SET %I = %I::text WHERE %I IS NULL', target_table, legacy_column, target_column, legacy_column);
            EXECUTE format('ALTER TABLE %I DROP COLUMN %I', target_table, target_column);
            EXECUTE format('ALTER TABLE %I ADD COLUMN %I UUID', target_table, target_column);
            EXECUTE format(
              'UPDATE %I SET %I = %I::uuid WHERE %I ~* %L',
              target_table,
              target_column,
              legacy_column,
              legacy_column,
              '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            );
          END IF;
        END;
        $$ LANGUAGE plpgsql;

        CREATE OR REPLACE FUNCTION _sist_map_user_uuid_fk(target_table text, target_column text)
        RETURNS void AS $$
        DECLARE
          legacy_column text := target_column || 'Legacy';
        BEGIN
          PERFORM _sist_ensure_uuid_column(target_table, target_column);
          IF to_regclass(format('%I', target_table)) IS NULL THEN
            RETURN;
          END IF;

          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = target_table
              AND column_name = legacy_column
          ) THEN
            EXECUTE format(
              'UPDATE %I t SET %I = u."_id" FROM "Users" u WHERE t.%I IS NULL AND t.%I ~ %L AND u."id" = (t.%I)::integer',
              target_table,
              target_column,
              target_column,
              legacy_column,
              '^\\d+$',
              legacy_column
            );
          END IF;
        END;
        $$ LANGUAGE plpgsql;

        SELECT _sist_map_user_uuid_fk('Projects', 'userId');
        SELECT _sist_map_user_uuid_fk('Projects', 'facultyId');
        SELECT _sist_ensure_uuid_column('Projects', 'centreId');
        SELECT _sist_ensure_uuid_column('Projects', 'researchCenterId');

        SELECT _sist_map_user_uuid_fk('FundRequests', 'userId');
        SELECT _sist_map_user_uuid_fk('FundRequests', 'facultyId');
        SELECT _sist_ensure_uuid_column('FundRequests', 'projectId');
        SELECT _sist_ensure_uuid_column('FundRequests', 'centreId');
        SELECT _sist_ensure_uuid_column('FundRequests', 'researchCenterId');

        SELECT _sist_map_user_uuid_fk('EventRequests', 'facultyId');
        SELECT _sist_ensure_uuid_column('EventRequests', 'projectId');
        SELECT _sist_map_user_uuid_fk('Notifications', 'userId');
        SELECT _sist_map_user_uuid_fk('Revenues', 'userId');
        SELECT _sist_map_user_uuid_fk('Revenues', 'verifiedBy');
        SELECT _sist_map_user_uuid_fk('InternshipFees', 'verifiedBy');
        SELECT _sist_map_user_uuid_fk('AcademicMetrics', 'facultyId');
        SELECT _sist_map_user_uuid_fk('ProjectMembers', 'userId');
        SELECT _sist_ensure_uuid_column('ProjectMembers', 'projectId');
        SELECT _sist_map_user_uuid_fk('EquipmentRequests', 'facultyId');
        SELECT _sist_map_user_uuid_fk('ODRequests', 'facultyId');
        SELECT _sist_map_user_uuid_fk('AuditLogs', 'userId');
        SELECT _sist_map_user_uuid_fk('Ledgers', 'createdByUserId');

        UPDATE "Notifications" SET "_id" = gen_random_uuid() WHERE "_id" IS NULL;
        UPDATE "InternshipFees" SET "_id" = gen_random_uuid() WHERE "_id" IS NULL;
        UPDATE "Revenues" SET "_id" = gen_random_uuid() WHERE "_id" IS NULL;
        UPDATE "AcademicMetrics" SET "_id" = gen_random_uuid() WHERE "_id" IS NULL;
        UPDATE "ProjectMembers" SET "_id" = gen_random_uuid() WHERE "_id" IS NULL;
        UPDATE "EquipmentRequests" SET "_id" = gen_random_uuid() WHERE "_id" IS NULL;
        UPDATE "ODRequests" SET "_id" = gen_random_uuid() WHERE "_id" IS NULL;

        CREATE INDEX IF NOT EXISTS "projects_faculty_id_idx" ON "Projects" ("facultyId");
        CREATE INDEX IF NOT EXISTS "projects_user_id_idx" ON "Projects" ("userId");
        CREATE INDEX IF NOT EXISTS "fund_requests_project_id_idx" ON "FundRequests" ("projectId");
        CREATE INDEX IF NOT EXISTS "fund_requests_faculty_id_idx" ON "FundRequests" ("facultyId");
        CREATE INDEX IF NOT EXISTS "fund_requests_user_id_idx" ON "FundRequests" ("userId");
        CREATE INDEX IF NOT EXISTS "event_requests_project_id_idx" ON "EventRequests" ("projectId");
        CREATE INDEX IF NOT EXISTS "event_requests_faculty_id_idx" ON "EventRequests" ("facultyId");
        CREATE INDEX IF NOT EXISTS "notifications_user_id_idx" ON "Notifications" ("userId");
        CREATE INDEX IF NOT EXISTS "revenues_user_id_idx" ON "Revenues" ("userId");
        CREATE INDEX IF NOT EXISTS "internship_fees_verified_by_idx" ON "InternshipFees" ("verifiedBy");
        CREATE INDEX IF NOT EXISTS "academic_metrics_faculty_id_idx" ON "AcademicMetrics" ("facultyId");
        CREATE INDEX IF NOT EXISTS "project_members_user_id_idx" ON "ProjectMembers" ("userId");
        CREATE INDEX IF NOT EXISTS "project_members_project_id_idx" ON "ProjectMembers" ("projectId");
        CREATE INDEX IF NOT EXISTS "equipment_requests_faculty_id_idx" ON "EquipmentRequests" ("facultyId");
        CREATE INDEX IF NOT EXISTS "od_requests_faculty_id_idx" ON "ODRequests" ("facultyId");
        CREATE UNIQUE INDEX IF NOT EXISTS "notifications_uuid_unique" ON "Notifications" ("_id");
        CREATE UNIQUE INDEX IF NOT EXISTS "internship_fees_uuid_unique" ON "InternshipFees" ("_id");
        CREATE UNIQUE INDEX IF NOT EXISTS "revenues_uuid_unique" ON "Revenues" ("_id");
        CREATE UNIQUE INDEX IF NOT EXISTS "academic_metrics_uuid_unique" ON "AcademicMetrics" ("_id");
        CREATE UNIQUE INDEX IF NOT EXISTS "project_members_uuid_unique" ON "ProjectMembers" ("_id");
        CREATE UNIQUE INDEX IF NOT EXISTS "equipment_requests_uuid_unique" ON "EquipmentRequests" ("_id");
        CREATE UNIQUE INDEX IF NOT EXISTS "od_requests_uuid_unique" ON "ODRequests" ("_id");

        DROP FUNCTION IF EXISTS _sist_map_user_uuid_fk(text, text);
        DROP FUNCTION IF EXISTS _sist_ensure_uuid_column(text, text);
      `, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "faculty_requests_created_by_legacy_idx";
      DROP INDEX IF EXISTS "faculty_requests_created_by_idx";
      DROP INDEX IF EXISTS "od_requests_status_idx";
      DROP INDEX IF EXISTS "equipment_requests_status_idx";
      DROP INDEX IF EXISTS "project_members_project_user_unique";
    `);
  },
};
