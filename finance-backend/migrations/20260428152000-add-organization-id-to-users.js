'use strict';

module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.sequelize.query(`
        ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "fk_users_org";
        ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "organizationId" VARCHAR(255);
        ALTER TABLE "Users"
          ALTER COLUMN "organizationId" TYPE VARCHAR(255)
          USING COALESCE("organizationId"::text, 'ORG_1');

        UPDATE "Users"
        SET "organizationId" = 'ORG_1'
        WHERE "organizationId" IS NULL OR "organizationId" = '';

        ALTER TABLE "Users" ALTER COLUMN "organizationId" SET DEFAULT 'ORG_1';
        ALTER TABLE "Users" ALTER COLUMN "organizationId" SET NOT NULL;
      `, { transaction: t });
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeConstraint('Users', 'fk_users_org').catch(() => {});
    await queryInterface.removeColumn('Users', 'organizationId').catch(() => {});
  }
};
