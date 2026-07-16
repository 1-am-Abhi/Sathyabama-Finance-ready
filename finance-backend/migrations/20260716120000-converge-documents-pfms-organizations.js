'use strict';

/**
 * Additive schema convergence for Documents, PFMSTransactions and Organizations.
 *
 * Context:
 *   The core finance tables (Users, Projects, FundRequests, Disbursements, ...)
 *   were converged onto an `id` UUID primary key alongside the legacy `_id`
 *   column. Two tables — Documents and PFMSTransactions — were only ever
 *   (re)created with an `_id` primary key and no `organizationId`, so their
 *   Sequelize models (which declare `id` + `organizationId`) drift from the
 *   physical schema and every query fails with `column "id" does not exist`.
 *
 *   The previous convergence migration (20260507160000) only fixed these tables
 *   when they were ABSENT (createTable branch). When the tables already existed
 *   with the old shape, the fix was skipped — leaving the drift in place.
 *
 * This migration is strictly ADDITIVE and NON-DESTRUCTIVE:
 *   - It only ADDS columns / indexes / a table; it never drops data.
 *   - The legacy `_id` column and its primary-key constraint are left intact.
 *   - `id` is added as a UNIQUE, NOT NULL, gen_random_uuid()-defaulted column,
 *     which is all Sequelize needs to treat it as the model primary key
 *     (findByPk, upsert ON CONFLICT ("id"), associations).
 *   - Every step is guarded so the migration is idempotent and safe to run
 *     against a production database whose exact state may differ from a fresh
 *     migrate.
 */

async function tableExists(queryInterface, tableName, transaction) {
  const rows = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = :tableName LIMIT 1`,
    { replacements: { tableName }, type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
  );
  return rows.length > 0;
}

async function columnExists(queryInterface, tableName, columnName, transaction) {
  const rows = await queryInterface.sequelize.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = :tableName AND column_name = :columnName LIMIT 1`,
    { replacements: { tableName, columnName }, type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
  );
  return rows.length > 0;
}

async function indexExists(queryInterface, tableName, indexName, transaction) {
  const rows = await queryInterface.sequelize.query(
    `SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND tablename = :tableName AND indexname = :indexName LIMIT 1`,
    { replacements: { tableName, indexName }, type: queryInterface.sequelize.QueryTypes.SELECT, transaction }
  );
  return rows.length > 0;
}

/**
 * Add a UUID `id` column (NOT NULL, gen_random_uuid() default) to an existing
 * legacy table if missing, back-filling existing rows with distinct UUIDs, and
 * give it a UNIQUE constraint so Sequelize can use it as the model primary key.
 */
async function ensureUuidIdColumn(queryInterface, tableName, uniqueIndexName, transaction) {
  if (!(await columnExists(queryInterface, tableName, 'id', transaction))) {
    // A volatile default (gen_random_uuid) is evaluated per-row on ADD COLUMN,
    // so every pre-existing row receives a distinct UUID.
    await queryInterface.sequelize.query(
      `ALTER TABLE "${tableName}" ADD COLUMN "id" UUID NOT NULL DEFAULT gen_random_uuid();`,
      { transaction }
    );
  }

  // Backfill any stragglers (e.g. rows inserted with an explicit NULL somehow).
  await queryInterface.sequelize.query(
    `UPDATE "${tableName}" SET "id" = gen_random_uuid() WHERE "id" IS NULL;`,
    { transaction }
  );

  if (!(await indexExists(queryInterface, tableName, uniqueIndexName, transaction))) {
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX "${uniqueIndexName}" ON "${tableName}" ("id");`,
      { transaction }
    );
  }
}

/** Ensure the legacy `_id` column still auto-populates for model-driven inserts. */
async function ensureLegacyIdDefault(queryInterface, tableName, transaction) {
  if (await columnExists(queryInterface, tableName, '_id', transaction)) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "${tableName}" ALTER COLUMN "_id" SET DEFAULT gen_random_uuid();`,
      { transaction }
    );
  }
}

async function ensureOrganizationIdColumn(queryInterface, tableName, indexName, transaction) {
  if (!(await columnExists(queryInterface, tableName, 'organizationId', transaction))) {
    await queryInterface.sequelize.query(
      `ALTER TABLE "${tableName}" ADD COLUMN "organizationId" VARCHAR(255) NOT NULL DEFAULT 'ORG_1';`,
      { transaction }
    );
  }
  await queryInterface.sequelize.query(
    `UPDATE "${tableName}" SET "organizationId" = 'ORG_1' WHERE "organizationId" IS NULL;`,
    { transaction }
  );
  if (!(await indexExists(queryInterface, tableName, indexName, transaction))) {
    await queryInterface.sequelize.query(
      `CREATE INDEX "${indexName}" ON "${tableName}" ("organizationId");`,
      { transaction }
    );
  }
}

async function ensureIndex(queryInterface, tableName, columnName, indexName, transaction) {
  if (
    (await columnExists(queryInterface, tableName, columnName, transaction)) &&
    !(await indexExists(queryInterface, tableName, indexName, transaction))
  ) {
    await queryInterface.sequelize.query(
      `CREATE INDEX "${indexName}" ON "${tableName}" ("${columnName}");`,
      { transaction }
    );
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";', { transaction });

      // ---- Documents ------------------------------------------------------
      if (await tableExists(queryInterface, 'Documents', transaction)) {
        await ensureUuidIdColumn(queryInterface, 'Documents', 'uq_documents_id', transaction);
        await ensureLegacyIdDefault(queryInterface, 'Documents', transaction);
        await ensureOrganizationIdColumn(queryInterface, 'Documents', 'idx_documents_org', transaction);
        await ensureIndex(queryInterface, 'Documents', 'facultyId', 'idx_documents_faculty_id', transaction);
      }

      // ---- PFMSTransactions ----------------------------------------------
      if (await tableExists(queryInterface, 'PFMSTransactions', transaction)) {
        await ensureUuidIdColumn(queryInterface, 'PFMSTransactions', 'uq_pfms_id', transaction);
        await ensureLegacyIdDefault(queryInterface, 'PFMSTransactions', transaction);
        await ensureOrganizationIdColumn(queryInterface, 'PFMSTransactions', 'idx_pfms_org', transaction);
        await ensureIndex(queryInterface, 'PFMSTransactions', 'projectId', 'idx_pfms_project_id', transaction);
      }

      // ---- Organizations (referenced by the Organization model) -----------
      if (!(await tableExists(queryInterface, 'Organizations', transaction))) {
        await queryInterface.createTable(
          'Organizations',
          {
            id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            name: {
              type: Sequelize.STRING,
              allowNull: true,
            },
            createdAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('NOW()'),
            },
            updatedAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('NOW()'),
            },
          },
          { transaction }
        );
      }
    });
  },

  async down() {
    // Intentionally non-destructive for production safety, consistent with the
    // other convergence migrations in this project. Rolling back would drop
    // columns that models depend on and could destroy data, so this is a no-op.
  },
};
