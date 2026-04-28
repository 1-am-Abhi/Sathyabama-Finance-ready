'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        const transaction = await queryInterface.sequelize.transaction();
        try {
            // TASK 2 — Prevent duplicate installments structurally
            try {
                await queryInterface.addIndex('Disbursements', ['fundRequestId', 'installmentNumber'], {
                    unique: true,
                    name: 'uq_request_installment',
                    transaction
                });
            } catch (err) {
                console.log('[Migration] Index uq_request_installment may already exist:', err.message);
            }

            // TASK 5 — Optimize Notification Performance
            try {
                await queryInterface.addIndex('Notifications', ['userId', 'isRead', 'createdAt'], {
                    name: 'idx_notifications_user_unread',
                    order: [['createdAt', 'DESC']],
                    transaction
                });
            } catch (err) {
                console.log('[Migration] Index idx_notifications_user_unread may already exist:', err.message);
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
            await queryInterface.removeIndex('Disbursements', 'uq_request_installment', { transaction }).catch(() => {});
            await queryInterface.removeIndex('Notifications', 'idx_notifications_user_unread', { transaction }).catch(() => {});
            await transaction.commit();
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }
};
