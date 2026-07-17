const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Durable storage for uploaded proof documents (bills / invoices / UCs).
//
// Render's filesystem is EPHEMERAL: files written to local disk are wiped on
// every deploy/restart, so `GET /uploads/<file>` returned 404 ("Route not
// found") for anything uploaded before the current instance started. Persisting
// the bytes in Postgres makes proofs durable and previewable/downloadable across
// restarts, and makes the upload a single fast DB write (no reliance on disk).
const UploadedFile = sequelize.define('UploadedFile', {
    filename: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    mimetype: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    size: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    data: {
        type: DataTypes.BLOB('long'),
        allowNull: false,
    },
}, {
    tableName: 'UploadedFiles',
    timestamps: true,
});

module.exports = UploadedFile;
