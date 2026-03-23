const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ODRequest = sequelize.define('ODRequest', {
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
    department: {
        type: DataTypes.STRING,
        allowNull: false
    },
    odType: {
        type: DataTypes.ENUM('ACADEMIC', 'INTERNATIONAL', 'JOURNAL'),
        defaultValue: 'ACADEMIC'
    },
    purpose: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    days: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'),
        defaultValue: 'PENDING'
    },
    proofUploaded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

module.exports = ODRequest;
