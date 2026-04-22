const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Disbursement = sequelize.define('Disbursement', {
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    fundRequestId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    projectId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    amount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    installmentNumber: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    isInstallment: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    approvedBy: {
        type: DataTypes.UUID,
        allowNull: true
    },
    approvedByName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    approvedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    isHighValue: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    disbursedBy: {
        type: DataTypes.UUID, // User ID of the Finance Officer
        allowNull: false
    },
    disbursedByName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    disbursedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    bankReference: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true // Prevent duplicate UTRs
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['projectId', 'installmentNumber']
        },
        {
            fields: ['projectId']
        }
    ]
});

module.exports = Disbursement;
