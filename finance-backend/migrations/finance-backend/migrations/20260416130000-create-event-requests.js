'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('EventRequests', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            title: Sequelize.STRING,
            description: Sequelize.TEXT,
            amount: Sequelize.FLOAT,
            status: Sequelize.STRING,
            organizationId: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'ORG_1'
            },
            createdAt: Sequelize.DATE,
            updatedAt: Sequelize.DATE
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable('EventRequests');
    }
};