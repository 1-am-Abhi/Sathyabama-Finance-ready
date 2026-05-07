const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const { disbursementQueue } = require('../queues/disbursementQueue');
const { 
    FundRequest, 
    Project, 
    Disbursement, 
    AuditLog, 
    ResearchCenter,
    Centre,
    User
} = require('../models');
const { Op } = require('sequelize');
const NotificationService = require('../services/notificationService');
const {
    normalizeFundRequest,
} = require('../services/pipelineMetricsService');
const {
    approveFundRequestPipeline,
} = require('../services/financePipelineService');
const { normalizeFundSource } = require('../services/fundSourceCatalogService');
const { safeEmit } = require('../socketInstance');
const { safeNumber, parseFY, safeArray } = require('../utils/safeUtils');

const ResearchCenterModel = ResearchCenter || Centre;
const PAYMENT_MODES = ['CHEQUE', 'NEFT', 'RTGS', 'UPI'];
const ROUNDING_TOLERANCE = 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const resolveCentreAssignment = async (project, user) => {
    const hasCentreModel = !!ResearchCenterModel;
    const userId = user?.id || user?._id;

    if (project?.centreId && hasCentreModel) {
        return {
            centreId: project.centreId,
            centre: project.centre || user?.centre || 'Research Centre',
        };
    }

    try {
        if (user?.centreId && hasCentreModel) {
            const centre = await ResearchCenterModel.findByPk(user.centreId);
            if (centre) return { centreId: centre._id || centre.id, centre: centre.name };
        }
        if (project?.centre && hasCentreModel) {
            const centre = await ResearchCenterModel.findOne({ where: { name: project.centre } });
            if (centre) return { centreId: centre._id || centre.id, centre: centre.name };
            return { centreId: null, centre: project.centre };
        }
    } catch (error) {
        logger.warn('[FundRequestController] ResearchCenter lookup failed:', error.message);
    }

    return { centreId: null, centre: project?.centre || user?.centre || 'Research Centre' };
};

const computeRemaining = async (project, organizationId) => {
    const total = safeNumber(project?.sanctionedBudget);
    const projectId = project?._id || project?.id;
    if (!projectId) return 0;
    const disbursed = safeNumber(await Disbursement.sum('amount', {
        where: { projectId, organizationId }
    }));
    return Math.max(0, total - disbursed);
};

const nextInstallmentNumber = async (projectId, organizationId) => {
    if (!projectId) return 1;
    const count = safeNumber(await FundRequest.count({
        where: {
            projectId,
            organizationId,
            status: { [Op.ne]: 'REJECTED' },
        },
    }));
    return count + 1;
};

// ─── READ ──────────────────────────────────────────────────────────────────────

const getFundRequests = asyncHandler(async (req, res) => {
    const orgId = req.user.organizationId;
    const userId = req.user?.id || req.user?._id;
    
    const where = { organizationId: orgId };

    if (req.user?.role === 'FACULTY') {
        where.facultyId = userId;
    }

    if (req.query.status) {
        const statuses = String(req.query.status)
            .split(',')
            .map((status) => status.trim())
            .filter(Boolean);
        if (statuses.length === 1) {
            where.status = statuses[0];
        } else if (statuses.length > 1) {
            where.status = { [Op.in]: statuses };
        }
    }

    const rawRequests = await FundRequest.findAll({
        where,
        include: [
            { model: Project, as: 'Project', required: false },
            { model: User, as: 'FacultyUser', attributes: ['name', 'department'], required: false },
            { model: Disbursement, as: 'Disbursements', required: false }
        ],
        order: [['createdAt', 'DESC']],
    });

    const requests = safeArray(rawRequests);
    const data = requests.map((r) => normalizeFundRequest(r));

    return res.json({ success: true, count: data.length, data: safeArray(data) });
});

const getFundRequest = asyncHandler(async (req, res) => {
    const request = await FundRequest.findOne({
        where: { 
            organizationId: req.user.organizationId,
            [Op.or]: [{ id: req.params.id }, { _id: req.params.id }]
        },
        include: [
            { model: Project, as: 'Project', required: false },
            { model: User, as: 'FacultyUser', attributes: ['name', 'email'], required: false },
            { model: Disbursement, as: 'Disbursements', required: false }
        ],
    });

    if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found', data: null });
    }

    return res.json({ success: true, data: normalizeFundRequest(request) });
});

// ─── WRITE ─────────────────────────────────────────────────────────────────────

const createFundRequest = asyncHandler(async (req, res) => {
    const facultyId = req.user?.id || req.user?._id;
    const orgId = req.user.organizationId;
    const {
        projectTitle, requestedAmount, purpose, source, totalBudget,
        projectId: bodyProjectId
    } = req.body;
    
    const amount = safeNumber(requestedAmount);

    if (!projectTitle || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Missing or invalid fields', data: null });
    }

    // 1. Resolve project
    let project = null;
    if (bodyProjectId) {
        project = await Project.findOne({ where: { _id: bodyProjectId, organizationId: orgId } });
    }
    if (!project) {
        project = await Project.findOne({ where: { title: projectTitle, facultyId, organizationId: orgId } });
    }

    if (!project) {
        const centreAssignment = await resolveCentreAssignment(null, req.user);
        project = await Project.create({
            title: projectTitle,
            pi: req.user?.name || 'Unknown',
            facultyId,
            organizationId: orgId,
            sanctionedBudget: safeNumber(totalBudget || amount),
            releasedBudget: 0,
            utilizedBudget: 0,
            status: 'PENDING',
            department: req.user?.department || 'RESEARCH',
            centre: centreAssignment.centre,
            centreId: centreAssignment.centreId,
            fundingSource: normalizeFundSource(source || 'PFMS'),
            description: purpose || `Auto-created for: ${projectTitle}`,
        });
    }

    if (project?.status === 'FROZEN') {
        return res.status(409).json({ success: false, message: 'Project is FROZEN. Requests suspended.', data: null });
    }

    // 2. Budget check
    const remaining = await computeRemaining(project, orgId);
    if (amount > remaining) {
        return res.status(400).json({ 
            success: false, 
            message: `Requested amount exceeds remaining budget ₹${remaining.toLocaleString()}`,
            data: [] 
        });
    }

    // 3. Create request
    const installmentNumber = await nextInstallmentNumber(project?._id || project?.id, orgId);
    const centreAssignment = await resolveCentreAssignment(project, req.user);

    const fundRequest = await FundRequest.create({
        projectTitle,
        projectId: project?._id || project?.id,
        faculty: req.user?.name || 'Unknown',
        facultyId,
        organizationId: orgId,
        requestedAmount: amount,
        installmentNumber,
        purpose,
        department: req.user?.department || 'RESEARCH',
        centre: centreAssignment.centre,
        centreId: centreAssignment.centreId,
        source: normalizeFundSource(source || project?.fundingSource),
        status: 'PENDING',
    });

    try {
        await NotificationService.notifyRole('ADMIN', 'New Fund Request', `${req.user?.name} submitted ₹${amount.toLocaleString()}.`, 'INFO', '/admin/fund-requests');
    } catch (e) { logger.warn('Notification failed'); }

    return res.status(201).json({ success: true, data: fundRequest });
});

const updateFundRequest = asyncHandler(async (req, res) => {
    const request = await FundRequest.findOne({ 
        where: { 
            organizationId: req.user.organizationId,
            [Op.or]: [{ id: req.params.id }, { _id: req.params.id }]
        } 
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found', data: null });

    if (req.body.documents) request.documents = req.body.documents;
    if (req.body.currentStage) request.currentStage = req.body.currentStage;

    await request.save();
    return res.json({ success: true, data: request });
});

const approveFundRequest = asyncHandler(async (req, res) => {
    const request = await FundRequest.findOne({ 
        where: { 
            organizationId: req.user.organizationId,
            [Op.or]: [{ id: req.params.id }, { _id: req.params.id }]
        } 
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found', data: null });

    if (request.status !== 'PENDING') {
        return res.status(409).json({ success: false, message: `Request is already ${request.status}`, data: null });
    }

    await approveFundRequestPipeline(request, req.user, req.body.remarks);

    try {
        await NotificationService.notifyFaculty(request, 'Fund Request Approved', 'Your request has been approved.', 'SUCCESS', '/faculty/request-funds');
    } catch (e) {}

    safeEmit('finance', 'finance:update', { type: 'APPROVAL', requestId: request.id, timestamp: Date.now() });

    return res.json({ success: true, data: request });
});

const rejectFundRequest = asyncHandler(async (req, res) => {
    const request = await FundRequest.findOne({ 
        where: { 
            organizationId: req.user.organizationId,
            [Op.or]: [{ id: req.params.id }, { _id: req.params.id }]
        } 
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found', data: null });

    await request.update({ status: 'REJECTED' });

    try {
        await NotificationService.notifyFaculty(request, 'Fund Request Rejected', `Reason: ${req.body.remarks || 'N/A'}`, 'ALERT', '/faculty/request-funds');
    } catch (e) {}

    return res.json({ success: true, data: request });
});

const disburseFund = asyncHandler(async (req, res) => {
    const request = await FundRequest.findOne({ 
        where: { 
            organizationId: req.user.organizationId,
            [Op.or]: [{ id: req.params.id }, { _id: req.params.id }]
        } 
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found', data: null });

    if (!['APPROVED', 'PARTIALLY_DISBURSED'].includes(request.status)) {
        return res.status(409).json({ success: false, message: 'Request must be approved first', data: null });
    }

    const totalDisbursed = safeNumber(await Disbursement.sum('amount', {
        where: { fundRequestId: request._id || request.id, organizationId: req.user.organizationId }
    }));
    const remainingAmount = Math.max(0, safeNumber(request.requestedAmount) - totalDisbursed);
    const installmentAmount = safeNumber(req.body.amount || req.body.disbursementAmount || remainingAmount);
    const paymentMode = String(req.body.paymentMode || 'NEFT').trim().toUpperCase();
    const chequeNumber = req.body.chequeNumber ? String(req.body.chequeNumber).trim() : null;
    const transactionId = req.body.transactionId ? String(req.body.transactionId).trim() : null;
    const bankName = req.body.bankName ? String(req.body.bankName).trim() : null;
    const referenceId = req.body.referenceId
        ? String(req.body.referenceId).trim()
        : (paymentMode === 'CHEQUE' ? chequeNumber : transactionId);

    if (installmentAmount <= 0 || installmentAmount - remainingAmount >= ROUNDING_TOLERANCE) {
        return res.status(400).json({
            success: false,
            message: `Disbursement amount must be between ₹1 and ₹${remainingAmount.toLocaleString()}`,
            data: []
        });
    }

    if (!PAYMENT_MODES.includes(paymentMode)) {
        return res.status(400).json({ success: false, message: 'Invalid payment mode', data: null });
    }

    if (paymentMode === 'CHEQUE' && (!chequeNumber || !bankName)) {
        return res.status(400).json({ success: false, message: 'Cheque number and bank name are required for CHEQUE payments', data: null });
    }

    if (paymentMode !== 'CHEQUE' && !transactionId) {
        return res.status(400).json({ success: false, message: 'UTR / transaction ID is required for digital payments', data: null });
    }

    if (!referenceId) {
        return res.status(400).json({ success: false, message: 'Missing referenceId for idempotency', data: null });
    }

    const payload = {
        referenceId,
        transactionId,
        chequeNumber,
        bankName,
        proofUrl: req.file?.path || req.body.proofUrl || null,
        paymentMode,
        disbursementDate: req.body.disbursementDate || null,
        remarks: req.body.remarks || '',
        amount: installmentAmount > remainingAmount ? remainingAmount : installmentAmount
    };

    try {
        const job = await disbursementQueue.add("disburse", {
            requestId: request.id || request._id,
            userId: req.user?.id || req.user?._id,
            payload
        });

        return res.status(202).json({
            success: true,
            message: job.returnvalue ? 'Disbursement executed' : 'Disbursement queued',
            data: job.returnvalue?.disbursement || [],
            totals: job.returnvalue?.totals || {
                requestedAmount: safeNumber(request.requestedAmount),
                totalDisbursed,
                remainingAmount
            }
        });
    } catch (err) {
        if (
            err.message.includes('Target project status') ||
            err.message.includes('Duplicate disbursement') ||
            err.message.includes('Overpayment protection') ||
            err.message.includes('Disbursement exceeds available') ||
            err.message.includes('No formal approval record') ||
            err.message.includes('Institutional Compliance') ||
            err.message.includes('mandatory to prevent duplicate') ||
            err.message.includes('Cannot disburse request in status')
        ) {
            return res.status(409).json({ success: false, message: err.message, data: null });
        }
        throw err;
    }
});

const getProjectWithInstallments = asyncHandler(async (req, res) => {
    const project = await Project.findOne({ 
        where: { 
            organizationId: req.user.organizationId,
            [Op.or]: [{ id: req.params.projectId }, { _id: req.params.projectId }]
        } 
    });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found', data: null });

    const installments = safeArray(await FundRequest.findAll({
        where: { projectId: project.id || project._id, organizationId: req.user.organizationId },
        include: [{ model: Disbursement, as: 'Disbursements', required: false }],
        order: [['installmentNumber', 'ASC']],
    }));

    const disbursedAmount = safeNumber(await Disbursement.sum('amount', { where: { projectId: project.id || project._id, organizationId: req.user.organizationId } }));

    return res.json({
        success: true,
        data: {
            project: {
                ...project.toJSON(),
                totalAmount: safeNumber(project.sanctionedBudget),
                disbursedAmount,
                remainingAmount: Math.max(0, safeNumber(project.sanctionedBudget) - disbursedAmount),
            },
            installments: installments.map(r => normalizeFundRequest(r)),
        },
    });
});

const advanceStage = asyncHandler(async (req, res) => {
    const request = await FundRequest.findOne({ 
        where: { 
            organizationId: req.user.organizationId,
            [Op.or]: [{ id: req.params.id }, { _id: req.params.id }]
        } 
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found', data: null });

    const { nextStage, remarks } = req.body;
    if (!nextStage) {
        return res.status(400).json({ success: false, message: 'Next stage is required', data: null });
    }

    const updated = await request.advanceStage(nextStage, req.user || {}, remarks || '');
    return res.json({ success: true, data: updated });
});

module.exports = {
    getFundRequests,
    getFundRequest,
    createFundRequest,
    updateFundRequest,
    approveFundRequest,
    rejectFundRequest,
    disburseFund,
    getProjectWithInstallments,
    advanceStage
};
