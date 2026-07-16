const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Disbursement = sequelize.define('Disbursement', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    fundRequestId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    projectId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    organizationId: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'ORG_1',
    },
    amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
    },
    disbursedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    installmentNumber: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1
    },
    disbursedBy: {
        type: DataTypes.UUID,
        allowNull: true
    },
    disbursedByName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bankReference: {
        type: DataTypes.STRING,
        allowNull: true
    },
    transactionId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    chequeNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bankName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    paymentMode: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'CHEQUE'
    },
    referenceId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    proofUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    idempotencyKey: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    },
    // Lifecycle status. The DB column is added by migrations
    // (20260507153000 / 20260507160000) but was never declared on the model,
    // so writes to it (e.g. marking a disbursement REVERSED) were silently
    // dropped by Sequelize. COMPLETED rows count toward budget/remaining math;
    // REVERSED rows are excluded (see NON_REVERSED_WHERE below).
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'COMPLETED'
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
