const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

const FUND_FLOW_STAGES = [
    'FUND_APPROVED',
    'FUND_RELEASED',
    'CHEQUE_RELEASED',
    'AMOUNT_DISBURSED',
    'UTILIZATION_COMPLETED',
    'SETTLEMENT_CLOSED'
];

class FundRequest extends Model {
    async advanceStage(nextStage, updatedBy, remarks) {
        const currentIndex = FUND_FLOW_STAGES.indexOf(this.currentStage);
        const nextIndex = FUND_FLOW_STAGES.indexOf(nextStage);
        
        if (nextIndex !== currentIndex + 1) {
            throw new Error(`Cannot jump from ${this.currentStage} to ${nextStage}. Sequential flow only.`);
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
    faculty: {
        type: DataTypes.STRING,
        allowNull: false
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
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
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
        type: DataTypes.STRING,
        allowNull: false
    },
    source: {
        type: DataTypes.ENUM('PFMS', 'DIRECTOR_INNOVATION'),
        allowNull: false
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
