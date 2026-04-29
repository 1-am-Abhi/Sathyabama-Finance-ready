'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            const disbursements = await queryInterface.describeTable('Disbursements');
            if (!disbursements.referenceId) {
                await queryInterface.addColumn('Disbursements', 'referenceId', {
                    type: Sequelize.STRING,
                    allowNull: true
                }, { transaction });
            }

            await queryInterface.sequelize.query(`
                UPDATE "Disbursements"
                SET "referenceId" = COALESCE(
                    NULLIF("referenceId", ''),
                    NULLIF("bankReference", ''),
                    NULLIF("transactionId", ''),
                    NULLIF("chequeNumber", ''),
                    "_id"::text
                )
                WHERE "referenceId" IS NULL OR "referenceId" = ''
            `, { transaction });

            await queryInterface.sequelize.query(`
                ALTER TABLE "Disbursements"
                ALTER COLUMN "referenceId" SET NOT NULL
            `, { transaction });

            await queryInterface.addIndex('Disbursements', ['referenceId'], {
                name: 'unique_reference_id',
                unique: true,
                transaction
            }).catch(() => {});

            await queryInterface.sequelize.query(`
                ALTER TABLE "Disbursements"
                ALTER COLUMN "amount" SET NOT NULL
            `, { transaction });

            await queryInterface.sequelize.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'chk_amount_positive'
                    ) THEN
                        ALTER TABLE "Disbursements"
                        ADD CONSTRAINT "chk_amount_positive"
                        CHECK ("amount" > 0);
                    END IF;
                END $$;
            `, { transaction });

            await queryInterface.addIndex('Disbursements', ['fundRequestId'], {
                name: 'idx_disbursements_fund_request_id_final',
                transaction
            }).catch(() => {});

            const ledgers = await queryInterface.describeTable('Ledgers');
            if (!ledgers.disbursementId) {
                await queryInterface.addColumn('Ledgers', 'disbursementId', {
                    type: Sequelize.UUID,
                    allowNull: true
                }, { transaction });
            }

            await queryInterface.addIndex('Ledgers', ['disbursementId'], {
                name: 'idx_ledger_disbursement',
                transaction
            }).catch(() => {});

            await queryInterface.sequelize.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'chk_disbursement_ledger_link'
                    ) THEN
                        ALTER TABLE "Ledgers"
                        ADD CONSTRAINT "chk_disbursement_ledger_link"
                        CHECK (
                            COALESCE("metadata"->>'financialOperation', '') <> 'DISBURSEMENT'
                            OR "disbursementId" IS NOT NULL
                        );
                    END IF;
                END $$;
            `, { transaction });

            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    },

    down: async (queryInterface) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.removeConstraint('Ledgers', 'chk_disbursement_ledger_link', { transaction }).catch(() => {});
            await queryInterface.removeIndex('Ledgers', 'idx_ledger_disbursement', { transaction }).catch(() => {});
            await queryInterface.removeIndex('Disbursements', 'idx_disbursements_fund_request_id_final', { transaction }).catch(() => {});
            await queryInterface.removeConstraint('Disbursements', 'chk_amount_positive', { transaction }).catch(() => {});
            await queryInterface.removeIndex('Disbursements', 'unique_reference_id', { transaction }).catch(() => {});
            await queryInterface.removeColumn('Disbursements', 'referenceId', { transaction }).catch(() => {});
            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
};
