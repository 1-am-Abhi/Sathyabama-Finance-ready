const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

const FUND_FLOW_STAGES = [
    'FUND_APPROVED',
    'FUND_RELEASED',
    'BILLS_UPLOADED',
    'CHEQUE_RELEASED',
    'AMOUNT_DISBURSED',
    'UTILIZATION_COMPLETED',
    'SETTLEMENT_CLOSED'
];

class FundRequest extends Model {
    async advanceStage(nextStage, updatedBy, remarks) {
        const currentIndex = FUND_FLOW_STAGES.indexOf(this.currentStage);
        const nextIndex = FUND_FLOW_STAGES.indexOf(nextStage);
        
        if (nextIndex <= currentIndex) {
            throw new Error(`Cannot move from ${this.currentStage} to ${nextStage}. Only forward movement is allowed.`);
        }
        
        const prevStage = this.currentStage;
        this.currentStage = nextStage;
        
        const newEntry = {
            stage: nextStage,
            prevStage,
            updatedBy: updatedBy._id,
            updatedByName: updatedBy.name,
            timestamp: new Date(),
            remarks
        };

        // Sequelize JSON updates need to be handled carefully
        const currentAudit = this.auditTrail || [];
        this.auditTrail = [...currentAudit, newEntry];
        
        // Auto-update chequeStatus
        if (nextStage === 'CHEQUE_RELEASED') this.chequeStatus = 'Approved';
        if (nextStage === 'AMOUNT_DISBURSED') this.chequeStatus = 'Disbursed';
        
        return this.save();
    }
}

FundRequest.init({
    _id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    projectTitle: {
        type: DataTypes.STRING,
        allowNull: false
    },
    projectId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    faculty: {
        type: DataTypes.STRING,
        allowNull: false
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    facultyId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    requestedAmount: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    purpose: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'PENDING_DISBURSAL', 'DISBURSED', 'REJECTED'),
        defaultValue: 'PENDING'
    },
    currentStage: {
        type: DataTypes.ENUM(...FUND_FLOW_STAGES),
        defaultValue: 'FUND_APPROVED'
    },
    chequeStatus: {
        type: DataTypes.ENUM('Pending', 'Approved', 'Disbursed'),
        defaultValue: 'Pending'
    },
    department: {
        type: DataTypes.STRING,
        allowNull: false
    },
    centre: {
        type: DataTypes.STRING, // Keep for backward compatibility/quick display
        allowNull: true
    },
    centreId: {
        type: DataTypes.UUID,
        allowNull: true
    },
    source: {
        type: DataTypes.ENUM('PFMS', 'INSTITUTIONAL', 'DIRECTOR', 'OTHERS'),
        allowNull: false
    },
    // CEER Budget Granularity details:
    majorEquipments: { type: DataTypes.FLOAT, defaultValue: 0 },
    minorEquipments: { type: DataTypes.FLOAT, defaultValue: 0 },
    consumables: { type: DataTypes.FLOAT, defaultValue: 0 },
    services: { type: DataTypes.FLOAT, defaultValue: 0 },
    amc: { type: DataTypes.FLOAT, defaultValue: 0 },
    documents: {
        type: DataTypes.JSON,
        defaultValue: []
    },
    auditTrail: {
        type: DataTypes.JSON,
        defaultValue: []
    }
}, { 
    sequelize, 
    modelName: 'FundRequest',
    timestamps: true 
});


module.exports = { FundRequest, FUND_FLOW_STAGES };
