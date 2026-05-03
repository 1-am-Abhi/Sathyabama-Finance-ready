'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Projects', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      title: Sequelize.STRING,
      status: Sequelize.STRING,
      organizationId: {
        type: Sequelize.STRING,
        defaultValue: 'ORG_1'
      },
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });

    console.log('✅ Projects created');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Projects');
  }
};