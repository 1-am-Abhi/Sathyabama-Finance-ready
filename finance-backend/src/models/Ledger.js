const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');
const crypto = require('crypto');

/**
 * Immutable Financial Ledger
 * The single source of truth for all financial movements.
 * Once created, a ledger entry MUST NEVER be updated or deleted.
 */
const Ledger = sequelize.define('Ledger', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    journalId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Link to the parent journal entry'
    },
    accountId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Link to the specific chart of account'
    },
    projectId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    fundRequestId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    disbursementId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    debit: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0.00,
        comment: 'Amount taken out (outflow)'
    },
    credit: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0.00,
        comment: 'Amount brought in (inflow)'
    },
    balanceAfter: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Cached balance for point-in-time reference'
    },
    referenceId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Cheque number, UTR, or Transaction ID'
    },
    hash: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: 'SHA-256 hash of this entry for tamper-evidence'
    },
    previousHash: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: 'Hash of the preceding ledger entry'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true
    }
}, {
    timestamps: true,
    updatedAt: false, // Immutable: Only createdAt
    hooks: {
        beforeUpdate: () => {
            throw new Error('IMMUTABILITY VIOLATION: Ledger entries cannot be updated.');
        },
        beforeDestroy: () => {
            throw new Error('IMMUTABILITY VIOLATION: Ledger entries cannot be deleted.');
        }
    },
    indexes: [
        { fields: ['projectId'] },
        { fields: ['fundRequestId'] },
        { fields: ['disbursementId'] },
        { fields: ['accountId'] },
        { fields: ['journalId'] },
        { fields: ['hash'] },
        { fields: ['createdAt'] }
    ]
});

// --- ACCOUNTING PERIOD LOCK & HASH CHAINING ---
Ledger.beforeCreate(async (ledger, options) => {
    // 1. Period Lock Check
    const { AccountingPeriod } = require('./index');
    const transactionDate = ledger.createdAt || new Date();
    
    const closedPeriod = await AccountingPeriod.findOne({
        where: {
            startDate: { [Op.lte]: transactionDate },
            endDate: { [Op.gte]: transactionDate },
            status: 'CLOSED'
        },
        transaction: options.transaction
    });

    if (closedPeriod) {
        throw new Error(`PERIOD LOCKED: Cannot post to a closed accounting period.`);
    }

    // 2. Hash Chaining (Deterministic & Concurrent-Safe)
    const lastEntry = await Ledger.findOne({
        order: [['createdAt', 'DESC'], ['id', 'DESC']],
        attributes: ['hash', 'id'],
        transaction: options.transaction,
        lock: options.transaction ? options.transaction.LOCK.UPDATE : true
    });

    const previousHash = lastEntry ? lastEntry.hash : '0'.repeat(64);
    ledger.previousHash = previousHash;

    // Deterministic payload (Sorted keys)
    const payload = {
        accountId: ledger.accountId,
        credit: String(ledger.credit || 0),
        debit: String(ledger.debit || 0),
        journalId: ledger.journalId,
        previousHash: ledger.previousHash,
        timestamp: transactionDate.getTime()
    };

    const sortedData = Object.keys(payload).sort().reduce((acc, key) => {
        acc[key] = payload[key];
        return acc;
    }, {});

    ledger.hash = crypto.createHash('sha256').update(JSON.stringify(sortedData)).digest('hex');
});

// --- TAMPER-PROOFING HOOKS ---
Ledger.beforeUpdate(() => {
    throw new Error('IMMUTABILITY VIOLATION: Ledger entries cannot be modified. Reversal required.');
});

Ledger.beforeDestroy(() => {
    throw new Error('AUDIT VIOLATION: Ledger entries cannot be deleted.');
});

module.exports = Ledger;
