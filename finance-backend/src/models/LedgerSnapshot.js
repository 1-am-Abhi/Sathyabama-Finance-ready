const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Ledger Snapshot
 * Stores periodic checkpoints of the ledger hash chain.
 * Provides a "last known good" state for audit reconstruction.
 */
const LedgerSnapshot = sequelize.define('LedgerSnapshot', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    snapshotName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    lastLedgerId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    lastHash: {
        type: DataTypes.STRING(64),
        allowNull: false
    },
    totalEntries: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    totalDebit: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
    },
    totalCredit: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    snapshotBy: {
        type: DataTypes.UUID,
        allowNull: true
    }
}, {
    timestamps: true,
    updatedAt: false
});

module.exports = LedgerSnapshot;
