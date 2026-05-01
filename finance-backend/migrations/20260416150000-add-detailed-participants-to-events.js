'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    const tableExists =
      tables.includes('EventRequests') ||
      tables.includes('eventrequests');

    if (!tableExists) {
      console.log('⚠️ Skipping migration: EventRequests table not found');
      return;
    }

    await queryInterface.addColumn('EventRequests', 'participants', {
      type: Sequelize.JSONB,
      allowNull: true
    });
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn('EventRequests', 'participants');
    } catch (err) {
      console.log('⚠️ Down migration skipped');
    }
  }
};