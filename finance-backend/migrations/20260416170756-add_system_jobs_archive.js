'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('SystemJobsArchive', {
      jobId: { type: Sequelize.STRING, primaryKey: true },
      requestId: { type: Sequelize.UUID },
      status: { type: Sequelize.STRING },
      processedAt: { type: Sequelize.DATE },
      error: { type: Sequelize.TEXT },
      archivedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
      originalCreatedAt: { type: Sequelize.DATE }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('SystemJobsArchive');
  }
};
