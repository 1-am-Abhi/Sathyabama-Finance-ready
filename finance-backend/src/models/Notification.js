const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Notification = sequelize.define('Notification', {
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true, // If null, it could be a role-based notification for all Admins/Finance
        comment: 'Receiver of the notification'
    },
    role: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Target role for broadcast notifications'
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    message: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        defaultValue: 'INFO'
    },
    relatedId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID of the related record (Project, FundRequest, etc.)'
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'Notifications',
    timestamps: true
});

module.exports = Notification;
