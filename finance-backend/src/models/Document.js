const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Document = sequelize.define('Document', {
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    facultyId: {
        type: DataTypes.UUID,
        allowNull: false
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
        // base64 encoded file data
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'PENDING'
    },
    adminRemarks: {
        type: DataTypes.STRING,
        allowNull: true
    },
    verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true
    }
});

module.exports = Document;
