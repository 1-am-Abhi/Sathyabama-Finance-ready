const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ResearchCenter = sequelize.define('ResearchCenter', {
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    code: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
    }
}, {
    timestamps: true,
    tableName: 'ResearchCenters' // Ensure consistency
});

module.exports = ResearchCenter;
