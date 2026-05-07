'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const fundSchema = await queryInterface.describeTable('FundRequests');
      let disbursementSchema = {};
      try {
        disbursementSchema = await queryInterface.describeTable('Disbursements');
      } catch {
        disbursementSchema = {};
      }

      if (!fundSchema.installmentNumber) {
        await queryInterface.addColumn(
          'FundRequests',
          'installmentNumber',
          {
            type: Sequelize.INTEGER,
            defaultValue: 1,
            allowNull: false
          },
          { transaction }
        );
      }

      if (!fundSchema.type) {
        await queryInterface.addColumn(
          'FundRequests',
          'type',
          {
            type: Sequelize.STRING,
            defaultValue: 'INSTALLMENT',
            allowNull: false
          },
          { transaction }
        );
      }

      await queryInterface.sequelize.query(
        `UPDATE "FundRequests"
         SET "type" = 'INSTALLMENT'
         WHERE "type" IS NULL OR "type" = ''`,
        { transaction }
      );

      const pkColumn = fundSchema._id ? '_id' : (fundSchema.id ? 'id' : null);
      const hasProjectId = !!fundSchema.projectId;
      const hasCreatedAt = !!fundSchema.createdAt;

      if (pkColumn && hasProjectId && hasCreatedAt) {
        await queryInterface.sequelize.query(`
          UPDATE "FundRequests" fr
          SET "installmentNumber" = sub.rn
          FROM (
            SELECT "${pkColumn}",
                   ROW_NUMBER() OVER (
                     PARTITION BY "projectId"
                     ORDER BY "createdAt" ASC
                   ) AS rn
            FROM "FundRequests"
            WHERE "projectId" IS NOT NULL
          ) sub
          WHERE fr."${pkColumn}" = sub."${pkColumn}"
        `, { transaction });
      } else {
        console.log('[Migration] Skipping installmentNumber backfill: required columns missing');
      }

      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "disbursements_fund_request_id_installment_number"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "uq_disbursements_fund_request_id"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "Disbursements_fundRequestId_key"`,
        { transaction }
      );

      if (disbursementSchema.fundRequestId) {
        await queryInterface.addIndex('Disbursements', ['fundRequestId'], {
          name: 'idx_disbursements_fund_request_installments',
          transaction
        }).catch(() => {});
      } else {
        console.log('[Migration] Skipping Disbursements index: fundRequestId missing');
      }

      await transaction.commit();
      console.log('[Migration] 20260428140000-installment-model-refactor completed successfully.');
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "idx_disbursements_fund_request_installments"`,
        { transaction }
      );
      await queryInterface.removeColumn('FundRequests', 'type', { transaction }).catch(() => {});
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};