const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EquipmentRequest = sequelize.define('EquipmentRequest', {
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    facultyId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    facultyName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    projectId: {
        type: DataTypes.STRING,
        allowNull: true
    },
    projectName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    equipmentName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    quantity: {
        type: DataTypes.STRING,
        allowNull: true
    },
    requestType: {
        type: DataTypes.STRING,
        defaultValue: 'PURCHASED'
    },
    requestedAmount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    approvedAmount: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    justification: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'Pending'
    },
    adminRemarks: {
        type: DataTypes.STRING,
        allowNull: true
    },
    billData: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

module.exports = EquipmentRequest;
