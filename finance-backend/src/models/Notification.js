const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Notification = sequelize.define('Notification', {
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        defaultValue: 'info'
    },
    message: {
        type: DataTypes.STRING(1000),
        allowNull: false
    },
    actionUrl: {
        type: DataTypes.STRING,
        allowNull: true
    },
    readRaw: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    targetUserId: {
        // For FACULTY notifications, this stores which specific faculty should see it
        // For ADMIN notifications, this is null (all admins see it)
        type: DataTypes.UUID,
        allowNull: true
    },
    createdBy: {
        // Name of the user who triggered this notification (prevents anonymous display)
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'System'
    }
});

module.exports = Notification;
