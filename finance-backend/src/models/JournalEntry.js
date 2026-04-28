const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Journal Entry
 * Groups multiple ledger entries into a single atomic, balanced financial transaction.
 * In double-entry accounting, sum(debits) MUST equal sum(credits) for a JournalEntry.
 */
const JournalEntry = sequelize.define('JournalEntry', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    referenceId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'External reference (UTR, Cheque, etc.)'
    },
    transactionDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    createdByUserId: {
        type: DataTypes.UUID,
        allowNull: true
    }
}, {
    timestamps: true,
    updatedAt: false // Journals should be immutable once posted
});

module.exports = JournalEntry;
