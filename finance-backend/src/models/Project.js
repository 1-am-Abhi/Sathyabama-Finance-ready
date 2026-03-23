const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Project = sequelize.define('Project', {
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
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
        allowNull: false
    },
    sanctionedBudget: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    releasedBudget: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    utilizedBudget: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('ACTIVE', 'COMPLETED', 'PENDING', 'REJECTED', 'PUBLISHED', 'SUBMITTED'),
        defaultValue: 'PENDING'
    },
    projectType: {
        type: DataTypes.STRING,
        defaultValue: 'PROJECT'
    },
    publisher: {
        type: DataTypes.STRING,
        allowNull: true
    },
    publicationYear: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    fundingSource: {
        type: DataTypes.ENUM('PFMS', 'INSTITUTIONAL', 'DIRECTOR_INNOVATION'),
        allowNull: false
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    endDate: {
        type: DataTypes.DATE,
        allowNull: true
    }
});

module.exports = Project;
