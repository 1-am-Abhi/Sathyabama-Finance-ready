'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Drop the old unique constraint on [projectId, installmentNumber] if it exists
    try {
      await queryInterface.removeIndex('Disbursements', ['projectId', 'installmentNumber']);
    } catch (e) {
      console.log('Old index [projectId, installmentNumber] not found, skipping removal.');
    }

    // 2. Add new unique constraint on [fundRequestId, installmentNumber]
    try {
      await queryInterface.addIndex('Disbursements', ['fundRequestId', 'installmentNumber'], {
        unique: true,
        name: 'disbursements_fund_request_installment_unique',
      });
    } catch (e) {
      console.log('Index [fundRequestId, installmentNumber] may already exist:', e.message);
    }

    // 3. Add non-unique index on fundRequestId for fast lookups
    try {
      await queryInterface.addIndex('Disbursements', ['fundRequestId'], {
        name: 'disbursements_fund_request_id',
      });
    } catch (e) {
      console.log('Index [fundRequestId] may already exist:', e.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeIndex('Disbursements', 'disbursements_fund_request_installment_unique');
    } catch (e) { /* ignore */ }
    try {
      await queryInterface.removeIndex('Disbursements', 'disbursements_fund_request_id');
    } catch (e) { /* ignore */ }
  }
};
