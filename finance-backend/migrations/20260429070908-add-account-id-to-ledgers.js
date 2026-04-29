'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.query(`
      ALTER TABLE "Ledgers" ADD COLUMN IF NOT EXISTS "accountId" UUID;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Ledgers', 'accountId');
  }
};
