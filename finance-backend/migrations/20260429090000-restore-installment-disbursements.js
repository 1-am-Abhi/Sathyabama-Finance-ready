'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const fundSchema = await queryInterface.describeTable('FundRequests').catch(() => ({}));
      const ledgerSchema = await queryInterface.describeTable('Ledgers').catch(() => ({}));

      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "uq_disbursements_fund_request_id"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS "Disbursements_fundRequestId_key"`,
        { transaction }
      );
      await queryInterface.sequelize.query(
        `ALTER TABLE "Disbursements" DROP CONSTRAINT IF EXISTS "Disbursements_fundRequestId_key"`,
        { transaction }
      );
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'chk_disbursements_amount_positive'
          ) THEN
            ALTER TABLE "Disbursements"
            ADD CONSTRAINT "chk_disbursements_amount_positive"
            CHECK ("amount" > 0);
          END IF;
        END $$;
      `, { transaction });

      const hasFundRequestId = fundSchema.fundRequestId;
      const hasCreatedAt = fundSchema.createdAt;
      const hasStatus = fundSchema.status;
      const hasRequestedAmount = fundSchema.requestedAmount;
      const pkColumn = fundSchema._id ? '_id' : (fundSchema.id ? 'id' : null);

      if (hasFundRequestId) {
        await queryInterface.addIndex('Disbursements', ['fundRequestId'], {
          name: 'idx_disbursements_fund_request_installments',
          transaction
        }).catch(() => {});
      }

      await queryInterface.addIndex('Disbursements', ['fundRequestId', 'installmentNumber'], {
        name: 'idx_disbursements_fund_request_installment_number',
        transaction
      }).catch(() => {});

      if (!ledgerSchema.disbursementId) {
        await queryInterface.addColumn('Ledgers', 'disbursementId', {
          type: Sequelize.UUID,
          allowNull: true
        }, { transaction });
      }

      await queryInterface.addIndex('Ledgers', ['disbursementId'], {
        name: 'idx_ledgers_disbursement_id',
        transaction
      }).catch(() => {});

      if (pkColumn && hasFundRequestId && hasCreatedAt && hasStatus && hasRequestedAmount) {
        await queryInterface.sequelize.query(`
          UPDATE "FundRequests" fr
          SET "status" = CASE
              WHEN COALESCE(ds."totalDisbursed", 0) = 0 THEN 'APPROVED'
              WHEN COALESCE(ds."totalDisbursed", 0) < fr."requestedAmount" THEN 'PARTIALLY_DISBURSED'
              ELSE 'COMPLETED'
          END,
          "currentStage" = CASE
              WHEN COALESCE(ds."totalDisbursed", 0) = 0 THEN 'FUND_APPROVED'::"enum_FundRequests_currentStage"
              ELSE 'AMOUNT_DISBURSED'::"enum_FundRequests_currentStage"
          END
          FROM (
              SELECT "fundRequestId", SUM("amount") AS "totalDisbursed"
              FROM "Disbursements"
              GROUP BY "fundRequestId"
          ) ds
          WHERE fr."${pkColumn}" = ds."fundRequestId"
            AND fr."status" IN ('APPROVED', 'DISBURSED', 'PARTIALLY_DISBURSED', 'COMPLETED')
        `, { transaction });
      } else {
        console.log('[Migration] Skipping FundRequests backfill: required columns missing');
      }

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeIndex('Disbursements', 'idx_disbursements_fund_request_installments', { transaction }).catch(() => {});
      await queryInterface.removeIndex('Disbursements', 'idx_disbursements_fund_request_installment_number', { transaction }).catch(() => {});
      await queryInterface.removeConstraint('Disbursements', 'chk_disbursements_amount_positive', { transaction }).catch(() => {});
      await queryInterface.removeIndex('Ledgers', 'idx_ledgers_disbursement_id', { transaction }).catch(() => {});
      await queryInterface.removeColumn('Ledgers', 'disbursementId', { transaction }).catch(() => {});
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};