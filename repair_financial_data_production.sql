-- ==============================================================================
-- PRODUCTION DEPLOYMENT SCRIPT (WITH COMMIT)
-- ==============================================================================
BEGIN;

-- ------------------------------------------------------------------------------
-- TASK 1: BACKUP (MANDATORY)
-- ------------------------------------------------------------------------------
CREATE TABLE "FundRequests_backup_20260427" AS SELECT * FROM "FundRequests";
CREATE TABLE "Projects_backup_20260427" AS SELECT * FROM "Projects";

-- Create a temporary stub if Disbursements doesn't exist so the backup doesn't fail
CREATE TABLE IF NOT EXISTS "Disbursements" ("_id" UUID PRIMARY KEY);
CREATE TABLE "Disbursements_backup_20260427" AS SELECT * FROM "Disbursements";

-- ------------------------------------------------------------------------------
-- TASK 2: CREATE DISBURSEMENTS TABLE (IF MISSING)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Disbursements" (
    "_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "fundRequestId" UUID NOT NULL,
    "projectId" UUID,
    "amount" NUMERIC NOT NULL,
    "disbursedBy" UUID,
    "installmentNumber" INTEGER,
    "isInstallment" BOOLEAN,
    "bankReference" VARCHAR(255),
    "remarks" TEXT,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- TASK 3: ADD FOREIGN KEYS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_disbursements_fundrequest') THEN
        ALTER TABLE "Disbursements"
        ADD CONSTRAINT fk_disbursements_fundrequest
        FOREIGN KEY ("fundRequestId") REFERENCES "FundRequests"("_id") ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_disbursements_user') THEN
        ALTER TABLE "Disbursements"
        ADD CONSTRAINT fk_disbursements_user
        FOREIGN KEY ("disbursedBy") REFERENCES "Users"("_id") ON DELETE SET NULL;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- TASK 4: CLEAN INVALID DATA
-- ------------------------------------------------------------------------------
-- 1. Delete orphan disbursements
DELETE FROM "Disbursements" WHERE "fundRequestId" NOT IN (SELECT "_id" FROM "FundRequests");

-- 2. Detect issues (We use a temp table to log issues instead of blind deletes)
CREATE TEMP TABLE anomalies_flagged AS
SELECT 
    f."_id" AS request_id, 
    f."requestedAmount",
    COALESCE(SUM(d."amount"), 0) AS total_disbursed,
    (f."requestedAmount" - COALESCE(SUM(d."amount"), 0)) AS remaining_amount
FROM "FundRequests" f
LEFT JOIN "Disbursements" d ON f."_id" = d."fundRequestId"
GROUP BY f."_id", f."requestedAmount"
HAVING (f."requestedAmount" - COALESCE(SUM(d."amount"), 0)) < 0;

-- Optional: Delete or flag disbursements where user ID is missing
-- DELETE FROM "Disbursements" WHERE "disbursedBy" IS NULL; 
-- (Commented out to avoid data loss; relies on NULL constraints)

-- ------------------------------------------------------------------------------
-- TASK 5 & 6: REBUILD FINANCIAL VALUES & FIX STATUS
-- ------------------------------------------------------------------------------
WITH RequestSums AS (
    SELECT 
        f."_id",
        f."requestedAmount",
        COALESCE(SUM(d."amount"), 0) AS releasedAmount,
        (f."requestedAmount" - COALESCE(SUM(d."amount"), 0)) AS remainingAmount
    FROM "FundRequests" f
    LEFT JOIN "Disbursements" d ON f."_id" = d."fundRequestId"
    GROUP BY f."_id", f."requestedAmount"
)
UPDATE "FundRequests" AS fr
SET "status" = CASE
    WHEN r.releasedAmount = 0 THEN 'PENDING_DISBURSAL'
    WHEN r.releasedAmount > 0 AND r.remainingAmount > 0 THEN 'PARTIALLY_DISBURSED'
    WHEN r.remainingAmount <= 0 THEN 'DISBURSED'
    ELSE 'PENDING'
END
FROM RequestSums r
WHERE fr."_id" = r."_id" 
  AND fr."status" IN ('PENDING_DISBURSAL', 'PARTIALLY_DISBURSED', 'DISBURSED', 'APPROVED');

-- ------------------------------------------------------------------------------
-- TASK 7: FIX PROJECT BUDGET
-- ------------------------------------------------------------------------------
WITH ProjectSums AS (
    SELECT 
        p."_id",
        COALESCE(SUM(d."amount"), 0) AS total_released
    FROM "Projects" p
    LEFT JOIN "Disbursements" d ON p."_id" = d."projectId"
    GROUP BY p."_id"
)
UPDATE "Projects" AS p
SET "releasedBudget" = ps.total_released
FROM ProjectSums ps
WHERE p."_id" = ps."_id" AND p."releasedBudget" IS DISTINCT FROM ps.total_released;

COMMIT;

-- ==============================================================================
-- TASK 8: VALIDATION QUERIES
-- ==============================================================================

-- Validation 1: Verify no over-disbursed requests (negative remainingAmount)
SELECT 
    f."_id", f."requestedAmount", COALESCE(SUM(d."amount"), 0) AS total_disbursed 
FROM "FundRequests" f 
LEFT JOIN "Disbursements" d ON f."_id" = d."fundRequestId"
GROUP BY f."_id", f."requestedAmount" 
HAVING COALESCE(SUM(d."amount"), 0) > f."requestedAmount";

-- Validation 2: Verify all statuses are validly aligned with disbursement amounts
SELECT 
    f."_id", f."status", f."requestedAmount", COALESCE(SUM(d."amount"), 0) AS releasedAmount
FROM "FundRequests" f
LEFT JOIN "Disbursements" d ON f."_id" = d."fundRequestId"
GROUP BY f."_id", f."status", f."requestedAmount"
HAVING 
    (COALESCE(SUM(d."amount"), 0) = 0 AND f."status" NOT IN ('PENDING', 'APPROVED', 'PENDING_DISBURSAL', 'REJECTED', 'CANCELLED')) OR
    (COALESCE(SUM(d."amount"), 0) > 0 AND COALESCE(SUM(d."amount"), 0) < f."requestedAmount" AND f."status" != 'PARTIALLY_DISBURSED') OR
    (COALESCE(SUM(d."amount"), 0) >= f."requestedAmount" AND f."status" != 'DISBURSED');

-- Validation 3: FK Integrity (Should return 0)
SELECT d."_id" 
FROM "Disbursements" d 
LEFT JOIN "FundRequests" f ON d."fundRequestId" = f."_id" 
WHERE f."_id" IS NULL;
