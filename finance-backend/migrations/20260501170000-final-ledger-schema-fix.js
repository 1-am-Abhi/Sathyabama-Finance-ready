'use strict';

const ORG_TABLES = [
  'Users',
  'Projects',
  'FundRequests',
  'EventRequests',
  'Disbursements',
];

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of ORG_TABLES) {
        await queryInterface.sequelize.query(`
          DO $$
          BEGIN
            IF to_regclass('"${table}"') IS NOT NULL THEN
              ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "organizationId" VARCHAR(255);
              UPDATE "${table}" SET "organizationId" = 'ORG_1' WHERE "organizationId" IS NULL;
              ALTER TABLE "${table}" ALTER COLUMN "organizationId" SET DEFAULT 'ORG_1';
              ALTER TABLE "${table}" ALTER COLUMN "organizationId" SET NOT NULL;
              CREATE INDEX IF NOT EXISTS "${table.toLowerCase()}_org_idx" ON "${table}" ("organizationId");
            END IF;
          END $$;
        `, { transaction });
      }

      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF to_regclass('"Ledgers"') IS NOT NULL THEN
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "accountId" UUID;
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "journalId" UUID;
            ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "disbursementId" UUID;

            CREATE INDEX IF NOT EXISTS "ledger_account_idx" ON "Ledgers" ("accountId");
            CREATE INDEX IF NOT EXISTS "ledger_journal_idx" ON "Ledgers" ("journalId");
            CREATE INDEX IF NOT EXISTS "ledger_disbursement_idx" ON "Ledgers" ("disbursementId");

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

        const pkCol = disbCols.has('_id') ? '_id' : (disbCols.has('id') ? 'id' : null);

        if (pkCol && disbCols.has('createdAt')) {
          await queryInterface.sequelize.query(`
            WITH duplicate_refs AS (
              SELECT
                "${pkCol}" AS pk,
                "referenceId",
                ROW_NUMBER() OVER (
                  PARTITION BY "referenceId"
                  ORDER BY "createdAt", "${pkCol}"
                ) AS rn
              FROM "Disbursements"
              WHERE "referenceId" IS NOT NULL AND "referenceId" <> ''
            )
            UPDATE "Disbursements" d
            SET "referenceId" = duplicate_refs."referenceId" || '-' || d."${pkCol}"::text
            FROM duplicate_refs
            WHERE d."${pkCol}" = duplicate_refs.pk
              AND duplicate_refs.rn > 1
          `, { transaction });
        }

        await queryInterface.sequelize.query(`
          ALTER TABLE "Disbursements" ALTER COLUMN "referenceId" SET NOT NULL
        `, { transaction }).catch(() => {});

        await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS "disbursement_reference_unique"
          ON "Disbursements" ("referenceId")
        `, { transaction });
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
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS "ledger_account_idx";
        DROP INDEX IF EXISTS "ledger_journal_idx";
        DROP INDEX IF EXISTS "ledger_disbursement_idx";
        DROP INDEX IF EXISTS "disbursement_reference_unique";
      `, { transaction });
    });
  },
};
