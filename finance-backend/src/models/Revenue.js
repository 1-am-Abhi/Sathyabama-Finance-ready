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
        type: DataTypes.ENUM('Consultancy', 'Events', 'Projects', 'Industry', 'Analysis', 'Other'),
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
    // Metrics that are typically updated by Finance
    growthRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0
    },
    efficiency: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: 0
    },
    submittedDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: true
});

module.exports = Revenue;
