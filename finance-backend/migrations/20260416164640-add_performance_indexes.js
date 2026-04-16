'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Indexes for high-frequency status queries
    await queryInterface.addIndex('FundRequests', ['status'], { name: 'idx_fundrequests_status' });
    await queryInterface.addIndex('Projects', ['status'], { name: 'idx_projects_status' });
    
    // Index for user-specific notification listing
    await queryInterface.addIndex('Notifications', ['userId'], { name: 'idx_notifications_userId' });
    
    // Compound index for faculty-project lookups
    await queryInterface.addIndex('ProjectMembers', ['userId', 'projectId'], { name: 'idx_projectmembers_user_project' });
    
    // Index for disbursement tracking
    await queryInterface.addIndex('Disbursements', ['projectId'], { name: 'idx_disbursements_projectId' });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('FundRequests', 'idx_fundrequests_status');
    await queryInterface.removeIndex('Projects', 'idx_projects_status');
    await queryInterface.removeIndex('Notifications', 'idx_notifications_userId');
    await queryInterface.removeIndex('ProjectMembers', 'idx_projectmembers_user_project');
    await queryInterface.removeIndex('Disbursements', 'idx_disbursements_projectId');
  }
};
