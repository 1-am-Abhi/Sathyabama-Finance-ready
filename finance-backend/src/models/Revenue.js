const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Revenue = sequelize.define('Revenue', {
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'Users',
            key: '_id'
        }
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    revenueSource: {
        type: DataTypes.ENUM('Consultancy', 'Events', 'Projects', 'Industry', 'Analysis', 'Internships', 'Other'),
        allowNull: false
    },
    amountGenerated: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
    },
    details: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('PENDING_ADMIN', 'ADMIN_APPROVED', 'VERIFIED', 'REJECTED'),
        defaultValue: 'PENDING_ADMIN'
    },
    verifiedAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true
    },
    bankReference: {
        type: DataTypes.STRING,
        allowNull: true
    },
    adminRemarks: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    financeRemarks: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    verifiedBy: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'Users',
            key: '_id'
        }
    }
}, {
    timestamps: true
});

module.exports = Revenue;
