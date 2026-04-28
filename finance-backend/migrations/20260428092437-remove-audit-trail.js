'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableInfo = await queryInterface.describeTable('FundRequests');
      if (tableInfo.auditTrail) {
          await queryInterface.removeColumn('FundRequests', 'auditTrail', { transaction });
      }
      // Also remove remainingAmount and releasedAmount if they exist as requested by user
      if (tableInfo.remainingAmount) {
          await queryInterface.removeColumn('FundRequests', 'remainingAmount', { transaction });
      }
      if (tableInfo.releasedAmount) {
          await queryInterface.removeColumn('FundRequests', 'releasedAmount', { transaction });
      }
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn('FundRequests', 'auditTrail', {
        type: Sequelize.JSON,
        defaultValue: []
      }, { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
