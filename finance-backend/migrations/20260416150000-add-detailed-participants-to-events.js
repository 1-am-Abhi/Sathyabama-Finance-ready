'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('EventRequests', 'internalParticipants', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: true
    });
    await queryInterface.addColumn('EventRequests', 'externalParticipants', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('EventRequests', 'internalParticipants');
    await queryInterface.removeColumn('EventRequests', 'externalParticipants');
  }
};
