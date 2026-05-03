'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    const tables = await queryInterface.showAllTables();

    const hasUsers =
      tables.includes('Users') || tables.includes('users');

    const hasProjects =
      tables.includes('Projects') || tables.includes('projects');

    // =========================
    // 🟢 USERS
    // =========================
    if (hasUsers) {
      const usersTable = await queryInterface.describeTable('Users');

      if (!usersTable.researchCenterId) {
        await queryInterface.addColumn('Users', 'researchCenterId', {
          type: Sequelize.UUID,
          allowNull: true
        });
        console.log('✅ researchCenterId added to Users');
      } else {
        console.log('⚠️ researchCenterId already exists in Users');
      }
    } else {
      console.log('⚠️ Users table not found, skipping');
    }

    // =========================
    // 🟢 PROJECTS
    // =========================
    if (hasProjects) {
      const projectsTable = await queryInterface.describeTable('Projects');

      if (!projectsTable.researchCenterId) {
        await queryInterface.addColumn('Projects', 'researchCenterId', {
          type: Sequelize.UUID,
          allowNull: true
        });
        console.log('✅ researchCenterId added to Projects');
      } else {
        console.log('⚠️ researchCenterId already exists in Projects');
      }
    } else {
      console.log('⚠️ Projects table not found, skipping');
    }
  },

  async down(queryInterface) {

    const tables = await queryInterface.showAllTables();

    try {
      if (tables.includes('Users') || tables.includes('users')) {
        const usersTable = await queryInterface.describeTable('Users');
        if (usersTable.researchCenterId) {
          await queryInterface.removeColumn('Users', 'researchCenterId');
        }
      }
    } catch {}

    try {
      if (tables.includes('Projects') || tables.includes('projects')) {
        const projectsTable = await queryInterface.describeTable('Projects');
        if (projectsTable.researchCenterId) {
          await queryInterface.removeColumn('Projects', 'researchCenterId');
        }
      }
    } catch {}
  }
};