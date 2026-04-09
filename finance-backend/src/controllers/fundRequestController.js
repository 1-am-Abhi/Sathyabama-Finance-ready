const { FundRequest, FUND_FLOW_STAGES } = require('../models/FundRequest');
const Project = require('../models/Project');
const { Op } = require('sequelize');
const NotificationService = require('../services/notificationService');

exports.getFundRequests = async (req, res) => {
    try {
        let options = { order: [['createdAt', 'DESC']] };
        if (req.user.role === 'FACULTY') {
            options.where = { 
                [Op.or]: [
                    { facultyId: req.user.id || req.user._id },
                    { userId: req.user.id || req.user._id },
                    { faculty: req.user.name }
                ]
            };
        }
        
        const requests = await FundRequest.findAll(options);
        res.status(200).json({ success: true, count: requests.length, data: requests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getFundRequest = async (req, res) => {
    try {
        const request = await FundRequest.findByPk(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
        res.status(200).json({ success: true, data: request });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.createFundRequest = async (req, res) => {
    try {
        // Idempotency check: prevent duplicate requests within 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const duplicate = await FundRequest.findOne({
            where: {
                facultyId: req.user.id || req.user._id,
                projectTitle: req.body.projectTitle,
                requestedAmount: req.body.requestedAmount,
                createdAt: { [Op.gte]: fiveMinutesAgo }
            }
        });

        if (duplicate) {
            return res.status(400).json({ 
                success: false, 
                message: 'A duplicate request was already submitted in the last 5 minutes. Please wait.' 
            });
        }

        // Find associated project first
        const existingProject = await Project.findOne({
            where: {
                [Op.or]: [
                    { title: req.body.projectTitle },
                    { [Op.and]: [{ pi: req.user.name }, { title: req.body.projectTitle }] }
                ]
            }
        });

        let standardizedSource = (req.body.source || 'PFMS').toUpperCase().replace(/ /g, '_');
        if (standardizedSource === 'DIRECTOR_INNOVATION') standardizedSource = 'DIRECTOR';
        if (!['PFMS', 'INSTITUTIONAL', 'DIRECTOR', 'OTHERS'].includes(standardizedSource)) {
            standardizedSource = 'OTHERS';
        }

        const requestData = {
            projectTitle: req.body.projectTitle,
            projectId: existingProject ? (existingProject._id || existingProject.id) : null,
            faculty: req.user.name,
            facultyId: req.user.id || req.user._id,
            userId: req.user.id || req.user._id,
            requestedAmount: Number(req.body.requestedAmount),
            purpose: req.body.purpose,
            department: req.user.department || 'RESEARCH',
            centre: req.user.centre || 'Research Centre',
            source: standardizedSource
        };
        const request = await FundRequest.create(requestData);

        // Auto-create Project record if it doesn't exist for this title/user
        if (!existingProject) {
            await Project.create({
                title: req.body.projectTitle,
                pi: req.user.name,
                userId: req.user.id || req.user._id,
                facultyId: req.user.id || req.user._id,
                sanctionedBudget: Number(req.body.requestedAmount),
                releasedBudget: 0,
                utilizedBudget: 0,
                status: 'PENDING',
                department: req.user.department || 'RESEARCH',
                centre: req.user.centre || 'Research Centre',
                fundingSource: requestData.source
            });
        }


        // NOTIFY: Admin about new fund request
        await NotificationService.notifyRole(
            'ADMIN',
            'New Fund Request',
            `Faculty ${req.user.name} submitted a new fund request for ₹${req.body.requestedAmount}.`,
            'INFO',
            request._id || request.id
        );

        res.status(201).json({ success: true, data: request });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateFundRequest = async (req, res) => {
    try {
        const request = await FundRequest.findByPk(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

        // Update the fields allowed
        if (req.body.documents) {
            request.documents = req.body.documents;
        }

        if (req.body.currentStage) {
            request.currentStage = req.body.currentStage;
        }

        await request.save();
        res.status(200).json({ success: true, data: request });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.approveFundRequest = async (req, res) => {
    try {
        const request = await FundRequest.findByPk(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
        
        const currentAudit = request.auditTrail || [];
        const newAuditEntry = {
            stage: 'FUND_APPROVED',
            prevStage: request.status,
            updatedBy: req.user.id,
            updatedByName: req.user.name,
            timestamp: new Date(),
            remarks: req.body.remarks || 'Approved by Admin'
        };

        console.log(`[PIPELINE] Approving Request ${req.params.id}: PENDING -> PENDING_DISBURSAL`);
        await request.update({
            status: 'PENDING_DISBURSAL',
            currentStage: 'FUND_APPROVED',
            auditTrail: [...currentAudit, newAuditEntry]
        });
        
        // NOTIFY: Faculty about approval
        await NotificationService.create(
            request.userId || request.facultyId,
            'Fund Request Approved',
            `Your fund request for '${request.projectTitle}' has been approved by Admin and moved to Finance queue.`,
            'SUCCESS',
            request._id || request.id
        );

        // NOTIFY: Finance about pending disbursal
        await NotificationService.notifyRole(
            'FINANCE_OFFICER',
            'New Disbursement Pending',
            `Admin approved a fund request of ₹${request.requestedAmount} for '${request.projectTitle}'. Action required in Finance Queue.`,
            'INFO',
            request._id || request.id
        );

        res.status(200).json({ success: true, data: request });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.rejectFundRequest = async (req, res) => {
    try {
        const request = await FundRequest.findByPk(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
        
        const currentAudit = request.auditTrail || [];
        console.log(`[PIPELINE] Rejecting Request ${req.params.id}: ${request.status} -> REJECTED`);
        await request.update({
            status: 'REJECTED',
            // FIX: Also reset currentStage so faculty UI (which reads currentStage || status) shows REJECTED
            currentStage: 'REJECTED',
            remarks: req.body.remarks || 'Rejected by Admin',
            auditTrail: [...currentAudit, {
                stage: 'REJECTED',
                prevStage: request.currentStage,
                updatedBy: req.user.id,
                updatedByName: req.user.name,
                timestamp: new Date(),
                remarks: req.body.remarks || 'Rejected by Admin'
            }]
        });
        
        // NOTIFY: Faculty about rejection
        await NotificationService.create(
            request.userId || request.facultyId,
            'Fund Request Rejected',
            `Your fund request for '${request.projectTitle}' was rejected. Reason: ${req.body.remarks || 'N/A'}`,
            'ALERT',
            request._id || request.id
        );

        res.status(200).json({ success: true, data: request });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.advanceStage = async (req, res) => {
    try {
        const { nextStage, remarks } = req.body;
        const request = await FundRequest.findByPk(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
        
        // Only Finance Officer or Admin can advance stages (except for faculty stage)
        if (req.user.role !== 'FINANCE_OFFICER' && req.user.role !== 'ADMIN' && nextStage !== 'UTILIZATION_COMPLETED') {
            return res.status(403).json({ success: false, message: 'Only Admin or Finance Officer can advance this stage' });
        }
        
        // Only Faculty can advance to UTILIZATION_COMPLETED
        if (nextStage === 'UTILIZATION_COMPLETED' && req.user.role !== 'FACULTY') {
            return res.status(403).json({ success: false, message: 'Only PI can submit utilization' });
        }
        
        await request.advanceStage(nextStage, { _id: req.user.id, name: req.user.name }, remarks);
        
        // If amount is disbursed, update the project released amount
        if (nextStage === 'AMOUNT_DISBURSED') {
            const project = await Project.findOne({ where: { title: request.projectTitle } });
            if (project) {
                await project.update({
                    releasedBudget: (project.releasedBudget || 0) + request.requestedAmount
                });
            }
        }
        
        // If settlement is closed, update project utilized amount
        if (nextStage === 'SETTLEMENT_CLOSED') {
            // Finding project by title as we don't have projectRef in simplified model yet
            const project = await Project.findOne({ where: { title: request.projectTitle } });
            if (project) {
                await project.update({
                    utilizedBudget: project.utilizedBudget + request.requestedAmount
                });
            }
        }
        
        res.status(200).json({ success: true, data: request });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};
