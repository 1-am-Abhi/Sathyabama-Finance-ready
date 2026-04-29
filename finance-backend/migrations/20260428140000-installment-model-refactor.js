'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            const tableDescription = await queryInterface.describeTable('FundRequests');

            // 1. Add installmentNumber if it doesn't exist
            if (!tableDescription.installmentNumber) {
                await queryInterface.addColumn('FundRequests', 'installmentNumber', {
                    type: Sequelize.INTEGER,
                    defaultValue: 1,
                    allowNull: false
                }, { transaction });
            }

            // 2. Add `type` column to FundRequests if not present
            if (!tableDescription.type) {
                await queryInterface.addColumn('FundRequests', 'type', {
                    type: Sequelize.STRING,
                    defaultValue: 'INSTALLMENT',
                    allowNull: false
                }, { transaction });
            }

            // 3. Backfill type field
            await queryInterface.sequelize.query(
                `UPDATE "FundRequests" SET "type" = 'INSTALLMENT' WHERE "type" IS NULL OR "type" = ''`,
                { transaction }
            );

            // 4. Backfill installmentNumber per project using row_number()
            await queryInterface.sequelize.query(`
                UPDATE "FundRequests" fr
                SET "installmentNumber" = sub.rn
                FROM (
                    SELECT "_id",
                           ROW_NUMBER() OVER (
                               PARTITION BY "projectId"
                               ORDER BY "createdAt" ASC
                           ) AS rn
                    FROM "FundRequests"
                    WHERE "projectId" IS NOT NULL
                ) sub
                WHERE fr."_id" = sub."_id"
            `, { transaction });

            // 5. Keep every disbursement row. Each row is a real installment.
            // 6. Drop old unique indexes that enforced a single payment per request.
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

            // 7. Add non-unique lookup index for fast installment sums.
            await queryInterface.addIndex('Disbursements', ['fundRequestId'], {
                name: 'idx_disbursements_fund_request_installments',
                transaction
            }).catch(() => {});

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
