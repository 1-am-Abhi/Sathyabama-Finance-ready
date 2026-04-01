const PFMSTransaction = require('../models/PFMSTransaction');
const InternshipFee = require('../models/InternshipFee');
const { FundRequest } = require('../models/FundRequest');
const Project = require('../models/Project');
const { sequelize } = require('../config/db');

exports.getFinanceStats = async (req, res) => {
    try {
        // Pending Releases: FUND_APPROVED but not yet FUND_RELEASED
        const pendingReleases = await FundRequest.count({ where: { currentStage: 'FUND_APPROVED' } });
        
        // Pending Disbursements: CHEQUE_RELEASED but not yet AMOUNT_DISBURSED
        const pendingDisbursements = await FundRequest.count({ where: { currentStage: 'CHEQUE_RELEASED' } });
        
        // Pending Settlements: UTILIZATION_COMPLETED but not yet SETTLEMENT_CLOSED
        const pendingSettlements = await FundRequest.count({ where: { currentStage: 'UTILIZATION_COMPLETED' } });
        
        // Internship Fees: PENDING payment status
        const pendingInternships = await InternshipFee.count({ where: { paymentStatus: 'PENDING' } });

        res.status(200).json({
            success: true,
            data: {
                pendingReleases,
                pendingDisbursements,
                pendingSettlements,
                pendingInternships
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getFundFlowProjects = async (req, res) => {
    try {
        // Get all fund requests that are NOT in initial stages or final closed stage
        const fundRequests = await FundRequest.findAll({
            where: {
                currentStage: ['FUND_APPROVED', 'FUND_RELEASED', 'CHEQUE_RELEASED', 'AMOUNT_DISBURSED', 'UTILIZATION_COMPLETED']
            },
            order: [['updatedAt', 'DESC']],
            include: [{ model: Project, attributes: ['title', 'piName', 'agency'] }]
        });
        
        res.status(200).json({
            success: true,
            data: fundRequests
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createPFMSTransaction = async (req, res) => {
    try {
        const transaction = await PFMSTransaction.create(req.body);
        res.status(201).json({ success: true, data: transaction });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getPFMSTransactions = async (req, res) => {
    try {
        const transactions = await PFMSTransaction.findAll({
            order: [['createdAt', 'DESC']],
            include: [{ model: Project }]
        });
        res.status(200).json({ success: true, data: transactions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getInternshipFees = async (req, res) => {
    try {
        const fees = await InternshipFee.findAll({ order: [['createdAt', 'DESC']] });
        res.status(200).json({ success: true, data: fees });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.verifyInternshipFee = async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentStatus, paymentMode, receiptNumber, paymentDate } = req.body;
        
        const fee = await InternshipFee.findByPk(id);
        if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found' });
        
        await fee.update({
            paymentStatus, paymentMode, receiptNumber, paymentDate,
            verifiedBy: req.user.id
        });
        
        res.status(200).json({ success: true, data: fee });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
