const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Document = sequelize.define('Document', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    facultyId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    facultyName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    fileName: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fileType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    documentType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'GENERAL'
    },
    projectName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fileData: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'PENDING'
    },
    adminRemarks: {
        type: DataTypes.STRING,
        allowNull: true
    },
    verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    organizationId: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'ORG_1'
    }
}, {
    tableName: 'Documents',
    timestamps: true
});

module.exports = Document;
