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

            // 5. Delete duplicate disbursements — keep only the LATEST per fundRequestId
            await queryInterface.sequelize.query(`
                DELETE FROM "Disbursements"
                WHERE "_id" NOT IN (
                    SELECT DISTINCT ON ("fundRequestId") "_id"
                    FROM "Disbursements"
                    ORDER BY "fundRequestId", "createdAt" DESC
                )
            `, { transaction });

            // 6. Drop old composite unique index (fundRequestId, installmentNumber) if exists
            await queryInterface.sequelize.query(
                `DROP INDEX IF EXISTS "disbursements_fund_request_id_installment_number"`,
                { transaction }
            );

            // 7. Add UNIQUE constraint on Disbursements(fundRequestId) — 1 disbursement per request
            await queryInterface.sequelize.query(
                `CREATE UNIQUE INDEX IF NOT EXISTS "uq_disbursements_fund_request_id" ON "Disbursements" ("fundRequestId")`,
                { transaction }
            );

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
                `DROP INDEX IF EXISTS "uq_disbursements_fund_request_id"`,
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
