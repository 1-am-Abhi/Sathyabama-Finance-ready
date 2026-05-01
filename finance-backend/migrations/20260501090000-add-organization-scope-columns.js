'use strict';

const TABLES = [
  { name: 'Users', index: 'idx_users_org' },
  { name: 'Projects', index: 'idx_projects_org' },
  { name: 'FundRequests', index: 'idx_fund_requests_org' },
  { name: 'EventRequests', index: 'idx_event_requests_org' },
  { name: 'Disbursements', index: 'idx_disbursements_org' },
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "fk_users_org";
      `, { transaction });

      for (const table of TABLES) {
        await queryInterface.sequelize.query(`
          ALTER TABLE "${table.name}" ADD COLUMN IF NOT EXISTS "organizationId" VARCHAR(255);
          ALTER TABLE "${table.name}" ALTER COLUMN "organizationId" TYPE VARCHAR(255) USING "organizationId"::VARCHAR;
          UPDATE "${table.name}" SET "organizationId" = 'ORG_1' WHERE "organizationId" IS NULL;
          ALTER TABLE "${table.name}" ALTER COLUMN "organizationId" SET NOT NULL;
          CREATE INDEX IF NOT EXISTS ${table.index} ON "${table.name}"("organizationId");
        `, { transaction });
      }
    });
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      for (const table of TABLES) {
        await queryInterface.sequelize.query(`
          DROP INDEX IF EXISTS ${table.index};
          ALTER TABLE "${table.name}" ALTER COLUMN "organizationId" DROP NOT NULL;
        `, { transaction });
      }
    });
  },
};
