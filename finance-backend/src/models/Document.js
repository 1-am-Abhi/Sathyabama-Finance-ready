const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Document = sequelize.define('Document', {
    // The Documents table's primary key is `_id` (created by the convergence
    // migrations). The model previously declared `id`, so every Document query
    // failed with `column "id" does not exist`. Match the real column.
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    // Virtual alias so any caller/frontend reading `.id` keeps working.
    id: {
        type: DataTypes.VIRTUAL,
        get() { return this.getDataValue('_id'); }
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
    }
    // NOTE: the Documents table has no organizationId column, so it is not
    // declared here. Faculty are scoped by facultyId; org-scoping documents
    // would require a migration to add the column + backfill.
}, {
    tableName: 'Documents',
    timestamps: true
});

module.exports = Document;
