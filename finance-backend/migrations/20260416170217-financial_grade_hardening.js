'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Persistent Job Tracking (Durability beyond Redis restarts)
    await queryInterface.createTable('SystemJobs', {
      jobId: { type: Sequelize.STRING, primaryKey: true },
      requestId: { type: Sequelize.UUID, allowNull: false },
      status: { type: Sequelize.STRING, defaultValue: 'PENDING' },
      processedAt: { type: Sequelize.DATE },
      error: { type: Sequelize.TEXT },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 2. Persistent Feature Flags
    await queryInterface.createTable('FeatureFlags', {
      key: { type: Sequelize.STRING, primaryKey: true },
      enabled: { type: Sequelize.BOOLEAN, defaultValue: false },
      updatedBy: { type: Sequelize.STRING },
      reason: { type: Sequelize.TEXT },
      lastAuditAt: { type: Sequelize.DATE },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });

    // 3. Request Tracing in Transactional Tables
    const tablesToHarden = ['FundRequests', 'Disbursements', 'Notifications'];
    for (const table of tablesToHarden) {
       await queryInterface.addColumn(table, 'requestId', {
         type: Sequelize.UUID,
         allowNull: true // Set to null for existing, enforced for new via controller
       });
    }

    // 4. DB-Level Idempotency Protection
    await queryInterface.addColumn('FundRequests', 'idempotencyKey', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addIndex('FundRequests', ['idempotencyKey'], {
      unique: true,
      where: { idempotencyKey: { [Sequelize.Op.ne]: null } }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('SystemJobs');
    await queryInterface.dropTable('FeatureFlags');
    await queryInterface.removeColumn('FundRequests', 'requestId');
    await queryInterface.removeColumn('Disbursements', 'requestId');
    await queryInterface.removeColumn('Notifications', 'requestId');
    await queryInterface.removeColumn('FundRequests', 'idempotencyKey');
  }
};
