const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PFMSTransaction = sequelize.define('PFMSTransaction', {
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    projectId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Projects',
            key: '_id'
        }
    },
    pfmsProjectId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    govtOrganization: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sanctionOrderNo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sanctionOrderDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    installmentNumber: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    amountReleased: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
    },
    creditDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    utrNumber: {
        type: DataTypes.STRING,
        allowNull: false
    },
    ucStatus: {
        type: DataTypes.ENUM('PENDING', 'SUBMITTED', 'APPROVED'),
        defaultValue: 'PENDING'
    }
}, {
    timestamps: true
});

module.exports = PFMSTransaction;
