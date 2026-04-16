'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.createTable('FacultyRequests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      requestType: {
        type: Sequelize.STRING,
      },
      companyName: {
        type: Sequelize.STRING,
      },
      patentStatus: {
        type: Sequelize.STRING,
      },
      approvedAmount: {
        type: Sequelize.FLOAT,
      },
      durationYears: {
        type: Sequelize.INTEGER,
      },
      approvalDate: {
        type: Sequelize.DATE,
      },
      amountReceived: {
        type: Sequelize.FLOAT,
      },
      fundSource: {
        type: Sequelize.STRING,
      },
      fundType: {
        type: Sequelize.STRING,
      },
      requestedAmount: {
        type: Sequelize.FLOAT,
      },
      reason: {
        type: Sequelize.TEXT,
      },
      participants: {
        type: Sequelize.JSONB,
        defaultValue: [],
      },
      billFile: {
        type: Sequelize.STRING,
      },
      proposalFile: {
        type: Sequelize.STRING,
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'APPROVED', 'REJECTED', 'DISBURSED'),
        defaultValue: 'PENDING',
      },
      currentStage: {
        type: Sequelize.ENUM('FACULTY', 'ADMIN', 'FINANCE'),
        defaultValue: 'ADMIN',
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      }
    });

    // Add constraint/index if necessary
    await queryInterface.addIndex('FacultyRequests', ['currentStage']);
    await queryInterface.addIndex('FacultyRequests', ['status']);
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable('FacultyRequests');
    // Drop enums if postgres
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_FacultyRequests_status";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_FacultyRequests_currentStage";');
  }
};
