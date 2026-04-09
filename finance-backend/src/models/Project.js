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
    userId: {
        type: DataTypes.UUID,
        allowNull: true // Allow true for legacy data
    },
    facultyId: {
        type: DataTypes.UUID,
        allowNull: true
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
        type: DataTypes.STRING, // Keep for legacy
        allowNull: true
    },
    centreId: {
        type: DataTypes.UUID,
        allowNull: true
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
        type: DataTypes.ENUM('ACTIVE', 'APPROVED', 'COMPLETED', 'PENDING', 'REJECTED', 'PUBLISHED', 'SUBMITTED'),
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
        type: DataTypes.ENUM('PFMS', 'INSTITUTIONAL', 'DIRECTOR', 'OTHERS'),
        allowNull: false
    },
    verificationScreenshot: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    startDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    endDate: {
        type: DataTypes.DATE,
        allowNull: true
    },
    proofUploaded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    proofStatus: {
        type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED'),
        defaultValue: 'PENDING'
    },
    proofRemarks: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    proofData: {
        type: DataTypes.TEXT,
        allowNull: true
    }
});

module.exports = Project;
