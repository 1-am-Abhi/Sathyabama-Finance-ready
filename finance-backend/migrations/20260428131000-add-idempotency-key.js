'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      const schema = await queryInterface.describeTable('Disbursements');

      const hasFundRequestId = !!schema.fundRequestId;
      const hasCreatedAt = !!schema.createdAt;

      if (!hasFundRequestId || !hasCreatedAt) {
        console.log('⚠️ Skipping idempotency index: required columns missing on Disbursements');
        return;
      }

      const [indexes] = await queryInterface.sequelize.query(`
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = current_schema()
          AND tablename = 'Disbursements'
          AND indexname = 'idx_disbursements_request_createdAt'
      `);

      if (indexes.length) {
        console.log('⚠️ Index already exists, skipping');
        return;
      }

      await queryInterface.addIndex('Disbursements', ['fundRequestId', 'createdAt'], {
        name: 'idx_disbursements_request_createdAt',
      });

      console.log('✅ Idempotency index added');
    } catch (err) {
      console.log('⚠️ Migration safely skipped:', err.message);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeIndex('Disbursements', 'idx_disbursements_request_createdAt');
    } catch (err) {
      console.log('⚠️ rollback skipped:', err.message);
    }
  }
};
