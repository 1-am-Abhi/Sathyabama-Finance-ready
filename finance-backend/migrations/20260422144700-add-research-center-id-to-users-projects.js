'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Safely add to Users
    const usersTable = await queryInterface.describeTable('Users');
    if (!usersTable.researchCenterId) {
      await queryInterface.addColumn('Users', 'researchCenterId', {
        type: Sequelize.UUID,
        allowNull: true
      });
    }

    // Safely add to Projects
    const projectsTable = await queryInterface.describeTable('Projects');
    if (!projectsTable.researchCenterId) {
      await queryInterface.addColumn('Projects', 'researchCenterId', {
        type: Sequelize.UUID,
        allowNull: true
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Safely remove from Users
    const usersTable = await queryInterface.describeTable('Users');
    if (usersTable.researchCenterId) {
      await queryInterface.removeColumn('Users', 'researchCenterId');
    }

    // Safely remove from Projects
    const projectsTable = await queryInterface.describeTable('Projects');
    if (projectsTable.researchCenterId) {
      await queryInterface.removeColumn('Projects', 'researchCenterId');
    }
  }
};
