const { FundRequest, FUND_FLOW_STAGES } = require('../models/FundRequest');
const Project = require('../models/Project');

exports.getFundRequests = async (req, res) => {
    try {
        let options = { order: [['createdAt', 'DESC']] };
        if (req.user.role === 'FACULTY') {
            options.where = { faculty: req.user.name }; // Using name as reference for now
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
        const requestData = {
            ...req.body,
            faculty: req.user.name,
            department: req.user.department,
            centre: req.user.centre || 'Research Centre'
        };
        const request = await FundRequest.create(requestData);
        res.status(201).json({ success: true, data: request });
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
            prevStage: 'PENDING',
            updatedBy: req.user.id,
            updatedByName: req.user.name,
            timestamp: new Date(),
            remarks: req.body.remarks || 'Approved by Admin'
        };

        await request.update({
            status: 'APPROVED',
            currentStage: 'FUND_APPROVED',
            auditTrail: [...currentAudit, newAuditEntry]
        });
        
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
        
        // Only Finance Officer can advance stages (except for faculty stage)
        if (req.user.role !== 'FINANCE_OFFICER' && nextStage !== 'UTILIZATION_COMPLETED') {
            return res.status(403).json({ success: false, message: 'Only Finance Officer can advance this stage' });
        }
        
        // Only Faculty can advance to UTILIZATION_COMPLETED
        if (nextStage === 'UTILIZATION_COMPLETED' && req.user.role !== 'FACULTY') {
            return res.status(403).json({ success: false, message: 'Only PI can submit utilization' });
        }
        
        await request.advanceStage(nextStage, { _id: req.user.id, name: req.user.name }, remarks);
        
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
