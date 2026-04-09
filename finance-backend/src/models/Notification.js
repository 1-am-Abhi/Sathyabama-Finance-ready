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
        type: DataTypes.STRING(1000),
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('INFO', 'SUCCESS', 'ALERT'),
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
    },
    createdBy: {
        type: DataTypes.STRING,
        defaultValue: 'System'
    }
}, {
    timestamps: true
});

Notification.associate = (models) => {
    Notification.belongsTo(models.User, { foreignKey: 'userId' });
};

module.exports = Notification;
