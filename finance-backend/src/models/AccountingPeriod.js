const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * Accounting Period
 * Tracks locked/unlocked financial periods to prevent backdated entries.
 */
const AccountingPeriod = sequelize.define('AccountingPeriod', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('OPEN', 'CLOSED'),
        defaultValue: 'OPEN'
    },
    closedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    closedBy: {
        type: DataTypes.UUID,
        allowNull: true
    }
}, {
    timestamps: true
});

module.exports = AccountingPeriod;
