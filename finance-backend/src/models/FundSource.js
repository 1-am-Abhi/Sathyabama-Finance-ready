const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FundSource = sequelize.define('FundSource', {
    sourceType: {
        type: DataTypes.STRING,   // e.g., 'collegeFunds', 'pfmsFunds'
        primaryKey: true,
        allowNull: false
    },
    totalAllocated: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    }
}, {
    timestamps: true
});

module.exports = FundSource;
