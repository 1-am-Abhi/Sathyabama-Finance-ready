'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Ledgers', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      accountId: Sequelize.UUID,
      journalId: Sequelize.UUID,
      disbursementId: Sequelize.UUID,
      debit: Sequelize.FLOAT,
      credit: Sequelize.FLOAT,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE
    });

    console.log('✅ Ledgers created');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Ledgers');
  }
};