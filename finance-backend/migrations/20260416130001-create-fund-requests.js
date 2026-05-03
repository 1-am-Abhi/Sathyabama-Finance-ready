'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('FundRequests', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      title: Sequelize.STRING,
      amount: Sequelize.FLOAT,
      status: {
        type: Sequelize.STRING,
        defaultValue: 'PENDING'
      },
      organizationId: {
        type: Sequelize.STRING,
        defaultValue: 'ORG_1'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    console.log('✅ FundRequests created');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('FundRequests');
  }
};