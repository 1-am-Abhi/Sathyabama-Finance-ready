const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PFMSTransaction = sequelize.define('PFMSTransaction', {
    // The PFMSTransactions table's primary key is `_id` (convergence migrations).
    // The model previously declared `id`, causing
    // `column PFMSTransaction.id does not exist` on every query.
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    id: {
        type: DataTypes.VIRTUAL,
        get() { return this.getDataValue('_id'); }
    },
    projectId: {
        type: DataTypes.UUID,
        allowNull: false
    },
    pfmsProjectId: {
        type: DataTypes.STRING,
        allowNull: false
    },
    govtOrganization: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sanctionOrderNo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    sanctionOrderDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    installmentNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    amountReleased: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
    },
    creditDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    utrNumber: {
        type: DataTypes.STRING,
        allowNull: true
    },
    ucStatus: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'PENDING'
    }
    // NOTE: the PFMSTransactions table has no organizationId column.
}, {
    tableName: 'PFMSTransactions',
    timestamps: true
});

module.exports = PFMSTransaction;
