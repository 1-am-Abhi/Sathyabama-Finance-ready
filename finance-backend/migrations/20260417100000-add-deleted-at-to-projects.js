'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the column exists first to be safe
    const tableInfo = await queryInterface.describeTable('Projects');
    if (!tableInfo.deletedAt) {
      await queryInterface.addColumn('Projects', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Projects', 'deletedAt');
  }
};
