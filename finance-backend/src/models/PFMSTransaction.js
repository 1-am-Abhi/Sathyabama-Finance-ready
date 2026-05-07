const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PFMSTransaction = sequelize.define('PFMSTransaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    projectId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    pfmsProjectId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    govtOrganization: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sanctionOrderNo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sanctionOrderDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    installmentNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    amountReleased: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
    },
    creditDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    utrNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ucStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'PENDING'
    },
    organizationId: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'ORG_1'
    }
}, {
    tableName: 'PFMSTransactions',
    timestamps: true
});

module.exports = PFMSTransaction;
