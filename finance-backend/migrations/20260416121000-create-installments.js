'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    const tables = await queryInterface.showAllTables();

    const exists =
      tables.includes('Installments') ||
      tables.includes('installments');

    if (exists) {
      console.log('⚠️ Installments table already exists, skipping');
      return;
    }

    await queryInterface.createTable('Installments', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },

      // 🔥 IMPORTANT (this was missing earlier)
      projectId: {
        type: Sequelize.UUID,
        allowNull: true
      },

      installmentNumber: {
        type: Sequelize.INTEGER,
        allowNull: false
      },

      amount: {
        type: Sequelize.FLOAT,
        allowNull: false
      },

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

    console.log('✅ Installments table created');
  },

  async down(queryInterface) {
    try {
      await queryInterface.dropTable('Installments');
    } catch (err) {
      console.log('⚠️ rollback skipped');
    }
  }
};