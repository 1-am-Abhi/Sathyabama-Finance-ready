const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const EventRequest = sequelize.define('EventRequest', {
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
    researchCentre: {
        type: DataTypes.STRING,
        allowNull: true
    },
    eventTitle: {
        type: DataTypes.STRING,
        allowNull: false
    },
    eventType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    venue: {
        type: DataTypes.STRING,
        allowNull: false
    },
    dates: {
        type: DataTypes.STRING,
        allowNull: false
    },
    participants: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    fundingType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fundingSource: {
        type: DataTypes.STRING,
        allowNull: true
    },
    approvedAmount: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REVOKED'),
        defaultValue: 'PENDING'
    },
    photosUploaded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    remarks: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

module.exports = EventRequest;
