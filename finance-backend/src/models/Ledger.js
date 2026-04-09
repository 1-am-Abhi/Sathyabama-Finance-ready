const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Ledger = sequelize.define('Ledger', {
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    entryType: {
        type: DataTypes.ENUM('INFLOW', 'OUTFLOW'),
        allowNull: false,
    },
    category: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'GENERAL',
    },
    amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0,
    },
    projectId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    fundRequestId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    disbursementId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    revenueId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    referenceId: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    financialYear: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    entryDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    createdByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
    },
}, {
    timestamps: true,
});

module.exports = Ledger;
