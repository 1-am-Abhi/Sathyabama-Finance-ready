'use strict';

const TABLES = [
  { name: 'Users', index: 'idx_users_org' },
  { name: 'Projects', index: 'idx_projects_org' },
  { name: 'FundRequests', index: 'idx_fund_requests_org' },
  { name: 'EventRequests', index: 'idx_event_requests_org' },
  { name: 'Disbursements', index: 'idx_disbursements_org' },
];

async function tableExists(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT 1
    FROM pg_tables
    WHERE schemaname = current_schema()
      AND tablename = :tableName
    LIMIT 1
    `,
    {
      replacements: { tableName },
    }
  );
  return rows.length > 0;
}

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "fk_users_org";
      `, { transaction });

      for (const table of TABLES) {
        const exists = await tableExists(queryInterface, table.name);
        if (!exists) {
          console.log(`⚠️ ${table.name} does not exist, skipping`);
          continue;
        }

        await queryInterface.sequelize.query(`
          ALTER TABLE "${table.name}" ADD COLUMN IF NOT EXISTS "organizationId" VARCHAR(255);
          UPDATE "${table.name}" SET "organizationId" = 'ORG_1' WHERE "organizationId" IS NULL;
          ALTER TABLE "${table.name}" ALTER COLUMN "organizationId" SET NOT NULL;
        `, { transaction });

        await queryInterface.sequelize.query(`
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1
              FROM pg_indexes
              WHERE schemaname = current_schema()
                AND tablename = '${table.name}'
                AND indexname = '${table.index}'
            ) THEN
              CREATE INDEX "${table.index}" ON "${table.name}"("organizationId");
            END IF;
          END $$;
        `, { transaction });
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of TABLES) {
        const exists = await tableExists(queryInterface, table.name);
        if (!exists) continue;

        await queryInterface.sequelize.query(`
          DROP INDEX IF EXISTS "${table.index}";
          ALTER TABLE "${table.name}" ALTER COLUMN "organizationId" DROP NOT NULL;
        `, { transaction });
      }
    });
  },
};
