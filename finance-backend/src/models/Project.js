const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Project = sequelize.define('Project', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    organizationId: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'ORG_1',
    },
    facultyId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    pi: {
        type: DataTypes.STRING,
        allowNull: false
    },
    department: {
        type: DataTypes.STRING,
        allowNull: false
    },
    centre: {
        type: DataTypes.STRING,
        allowNull: true
    },
    sanctionedBudget: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    fundingSource: {
        type: DataTypes.STRING,
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'PENDING'
    }
}, {
    tableName: 'Projects',
    timestamps: true,
    paranoid: false
});

module.exports = Project;
