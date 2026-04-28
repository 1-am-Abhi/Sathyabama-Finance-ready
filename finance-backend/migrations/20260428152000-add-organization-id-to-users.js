'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "organizationId" INTEGER;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'organizationId');
  }
};
