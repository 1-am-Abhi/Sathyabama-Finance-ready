'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // For PostgreSQL, modifying an ENUM is complex. The safest way is to change the column to STRING.
    await queryInterface.changeColumn('FundRequests', 'status', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'PENDING'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Reverting back might be tricky, but we can leave it as STRING
    await queryInterface.changeColumn('FundRequests', 'status', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'PENDING'
    });
  }
};
