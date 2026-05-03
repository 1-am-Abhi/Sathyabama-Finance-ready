'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Accounts', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
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

    console.log('✅ Accounts table created');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Accounts');
  }
};