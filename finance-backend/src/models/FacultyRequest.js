const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

class FacultyRequest extends Model {}

FacultyRequest.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    requestType: { type: DataTypes.STRING },
    companyName: { type: DataTypes.STRING },
    patentStatus: { type: DataTypes.STRING },
    approvedAmount: { type: DataTypes.FLOAT },
    durationYears: { type: DataTypes.INTEGER },
    approvalDate: { type: DataTypes.DATE },
    amountReceived: { type: DataTypes.FLOAT },
    fundSource: { type: DataTypes.STRING },
    fundType: { type: DataTypes.STRING },
    requestedAmount: { type: DataTypes.FLOAT },
    reason: { type: DataTypes.TEXT },
    participants: { type: DataTypes.JSONB, defaultValue: [] },
    billFile: { type: DataTypes.STRING },
    proposalFile: { type: DataTypes.STRING },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'DISBURSED'),
        defaultValue: 'PENDING'
    },
    currentStage: {
        type: DataTypes.ENUM('FACULTY', 'ADMIN', 'FINANCE'),
        defaultValue: 'FACULTY'
    },
    createdBy: {
        type: DataTypes.UUID,
        allowNull: false
    },
    createdByLegacy: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    sequelize,
    modelName: 'FacultyRequest',
    tableName: 'FacultyRequests',
    timestamps: true
});

module.exports = FacultyRequest;
