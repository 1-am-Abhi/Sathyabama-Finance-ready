'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    const has = (name) =>
      tables.includes(name) || tables.includes(name.toLowerCase());

    // FundRequests
    if (has('FundRequests')) {
      await queryInterface.addIndex('FundRequests', ['status'], {
        name: 'idx_fundrequests_status'
      });
    } else {
      console.log('⚠️ Skipping FundRequests index');
    }

    // Projects
    if (has('Projects')) {
      await queryInterface.addIndex('Projects', ['status'], {
        name: 'idx_projects_status'
      });
    }

    // Notifications
    if (has('Notifications')) {
      await queryInterface.addIndex('Notifications', ['userId'], {
        name: 'idx_notifications_userId'
      });
    }

    // ProjectMembers
    if (has('ProjectMembers')) {
      await queryInterface.addIndex(
        'ProjectMembers',
        ['userId', 'projectId'],
        {
          name: 'idx_projectmembers_user_project'
        }
      );
    }

    // Disbursements
    if (has('Disbursements')) {
      await queryInterface.addIndex('Disbursements', ['projectId'], {
        name: 'idx_disbursements_projectId'
      });
    }
  },

  async down(queryInterface) {
    const safeRemove = async (table, index) => {
      try {
        await queryInterface.removeIndex(table, index);
      } catch (err) {
        console.log(`⚠️ Skipping remove ${index}`);
      }
    };

    await safeRemove('FundRequests', 'idx_fundrequests_status');
    await safeRemove('Projects', 'idx_projects_status');
    await safeRemove('Notifications', 'idx_notifications_userId');
    await safeRemove('ProjectMembers', 'idx_projectmembers_user_project');
    await safeRemove('Disbursements', 'idx_disbursements_projectId');
  }
};