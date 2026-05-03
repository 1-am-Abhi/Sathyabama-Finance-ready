'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Disbursements', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      projectId: Sequelize.UUID,
      amount: Sequelize.FLOAT,
      referenceId: Sequelize.STRING,
      organizationId: {
        type: Sequelize.STRING,
        defaultValue: 'ORG_1'
      },
      createdAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    console.log('✅ Disbursements created');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Disbursements');
  }
};