'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Add organizationId column if it doesn't exist
      await queryInterface.sequelize.query(`
        ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "organizationId" INTEGER;
      `, { transaction: t });

      // 2. Add foreign key constraint safely
      // We check if Organizations table exists before adding FK
      const [tableExists] = await queryInterface.sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'Organizations'
        );
      `, { transaction: t });

      if (tableExists[0].exists) {
        await queryInterface.sequelize.query(`
          ALTER TABLE "Users" DROP CONSTRAINT IF EXISTS "fk_users_org";
          ALTER TABLE "Users"
          ADD CONSTRAINT "fk_users_org"
          FOREIGN KEY ("organizationId")
          REFERENCES "Organizations"(id)
          ON DELETE RESTRICT;
        `, { transaction: t });
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeConstraint('Users', 'fk_users_org');
    await queryInterface.removeColumn('Users', 'organizationId');
  }
};
