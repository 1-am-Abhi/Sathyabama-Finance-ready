const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * SystemJobs Model
 * Persistent tracking of distributed background tasks.
 */
const SystemJob = sequelize.define('SystemJob', {
    jobId: {
        type: DataTypes.STRING,
        primaryKey: true
    },
    requestId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'PENDING' // PENDING, PROCESSING, COMPLETED, FAILED
    },
    processedAt: {
        type: DataTypes.DATE
    },
    error: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'SystemJobs',
    timestamps: true
});

module.exports = SystemJob;
