const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Chart of Accounts
 * Defines the types of accounts used in the double-entry system.
 */
const Account = sequelize.define('Account', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Account code (e.g., 1001 for Bank, 5001 for Expense)'
    },
    type: {
        type: DataTypes.ENUM('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    organizationId: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'ORG_1'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    timestamps: true
});

module.exports = Account;
