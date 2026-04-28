'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            // TASK 1 - Add idempotencyKey column
            await queryInterface.addColumn('Disbursements', 'idempotencyKey', {
                type: Sequelize.STRING,
                allowNull: true, // Allow null for old records temporarily
            }, { transaction });

            // TASK 1 - Unique index on idempotencyKey
            await queryInterface.addIndex('Disbursements', ['idempotencyKey'], {
                unique: true,
                name: 'uq_disbursement_idempotency',
                where: { idempotencyKey: { [Sequelize.Op.ne]: null } },
                transaction
            });

            // TASK 4 - Ensure foreign key (already exists, but we can verify/enforce constraints if needed)
            // TASK 4 - Add positive amount check (already added in previous migration, skip to avoid error)

            // TASK 5 - Add performance index
            await queryInterface.addIndex('Disbursements', ['fundRequestId', 'createdAt'], {
                name: 'idx_disbursements_request_createdAt',
                order: [['createdAt', 'DESC']],
                transaction
            });

            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            console.error('[Migration] Failed:', err);
            throw err;
        }
    },

    down: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.removeIndex('Disbursements', 'idx_disbursements_request_createdAt', { transaction });
            await queryInterface.removeIndex('Disbursements', 'uq_disbursement_idempotency', { transaction });
            await queryInterface.removeColumn('Disbursements', 'idempotencyKey', { transaction });
            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
};
