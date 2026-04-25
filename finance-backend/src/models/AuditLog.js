const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const AuditLog = sequelize.define('AuditLog', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    action: {
        type: DataTypes.STRING, /* e.g., 'FUND_REQUEST_CREATED', 'APPROVED', 'DISBURSED' */
        allowNull: false
    },
    entityType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    entityId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    metadata: {
        type: DataTypes.JSONB,
        allowNull: true
    }
}, {
    timestamps: true,
    updatedAt: false,
    indexes: [
        { fields: ['userId'] },
        { fields: ['entityType', 'entityId'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = AuditLog;
