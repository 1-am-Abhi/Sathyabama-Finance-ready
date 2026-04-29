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
    organizationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        validate: {
            min: 0.01 // TASK 4 — CHECK (amount > 0)
        }
    },
    installmentNumber: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    isInstallment: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
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
    referenceId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    chequeNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    bankName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    transactionId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    proofUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    paymentMode: {
        type: DataTypes.ENUM('CHEQUE', 'UPI', 'NEFT', 'RTGS'),
        defaultValue: 'CHEQUE'
    },
    // TASK 1 — Idempotency Key
    idempotencyKey: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    }
}, {
    timestamps: true,
    indexes: [
        {
            fields: ['projectId']
        },
        {
            fields: ['fundRequestId']
        },
        {
            fields: ['fundRequestId', 'installmentNumber']
        },
        {
            fields: ['referenceId'],
            unique: true
        }
    ]
});

module.exports = Disbursement;
