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

const computeRemaining = async (project) => {
    const total = safeNumber(project?.sanctionedBudget);
    const projectId = project?._id || project?.id;
    if (!projectId) return 0;
    const disbursed = safeNumber(await Disbursement.sum('amount', {
        where: { projectId }
    }));
    return Math.max(0, total - disbursed);
};

const nextInstallmentNumber = async (projectId) => {
    if (!projectId) return 1;
    const count = safeNumber(await FundRequest.count({
        where: {
            projectId,
            status: { [Op.ne]: 'REJECTED' },
        },
    }));
    return count + 1;
};

// ─── READ ──────────────────────────────────────────────────────────────────────

const getFundRequests = asyncHandler(async (req, res) => {
    const orgId = req.user?.organizationId || null;
    const userId = req.user?.id || req.user?._id;
    
    const where = {
        ...(orgId && { organizationId: orgId })
    };

    if (req.user?.role === 'FACULTY') {
        where.facultyId = userId;
    }

    const rawRequests = await FundRequest.findAll({
        where,
        include: [
            { model: Project, as: 'Project', required: false },
            { model: User, as: 'FacultyUser', attributes: ['name', 'department'], required: false }
        ],
        order: [['createdAt', 'DESC']],
    });

    const requests = safeArray(rawRequests);
    const data = requests.map((r) => normalizeFundRequest(r));

    return res.json({ success: true, count: data.length, data: safeArray(data) });
});

const getFundRequest = asyncHandler(async (req, res) => {
    const request = await FundRequest.findByPk(req.params.id, {
        include: [
            { model: Project, as: 'Project', required: false },
            { model: User, as: 'FacultyUser', attributes: ['name', 'email'], required: false },
            { model: Disbursement, as: 'Disbursement', required: false }
        ],
    });

    if (!request) {
        return res.status(200).json({ success: false, message: 'Request not found', data: [] });
    }

    return res.json({ success: true, data: normalizeFundRequest(request) });
});

// ─── WRITE ─────────────────────────────────────────────────────────────────────

const createFundRequest = asyncHandler(async (req, res) => {
    const facultyId = req.user?.id || req.user?._id;
    const orgId = req.user?.organizationId || null;
    const {
        projectTitle, requestedAmount, purpose, source, totalBudget,
        projectId: bodyProjectId
    } = req.body;
    
    const amount = safeNumber(requestedAmount);

    if (!projectTitle || amount <= 0) {
        return res.status(200).json({ success: false, message: 'Missing or invalid fields', data: [] });
    }

    // 1. Resolve project
    let project = null;
    if (bodyProjectId) {
        project = await Project.findByPk(bodyProjectId);
    }
    if (!project) {
        project = await Project.findOne({ where: { title: projectTitle, facultyId } });
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
        return res.status(200).json({ success: false, message: 'Project is FROZEN. Requests suspended.', data: [] });
    }

    // 2. Budget check
    const remaining = await computeRemaining(project);
    if (amount > remaining) {
        return res.status(200).json({ 
            success: false, 
            message: `Requested amount exceeds remaining budget ₹${remaining.toLocaleString()}`,
            data: [] 
        });
    }

    // 3. Create request
    const installmentNumber = await nextInstallmentNumber(project?._id || project?.id);
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
    const request = await FundRequest.findByPk(req.params.id);
    if (!request) return res.status(200).json({ success: false, message: 'Request not found', data: [] });

    if (req.body.documents) request.documents = req.body.documents;
    if (req.body.currentStage) request.currentStage = req.body.currentStage;

    await request.save();
    return res.json({ success: true, data: request });
});

const approveFundRequest = asyncHandler(async (req, res) => {
    const request = await FundRequest.findByPk(req.params.id);
    if (!request) return res.status(200).json({ success: false, message: 'Request not found', data: [] });

    if (request.status !== 'PENDING') {
        return res.status(200).json({ success: false, message: `Request is already ${request.status}`, data: [] });
    }

    await approveFundRequestPipeline(request, req.user, req.body.remarks);

    try {
        await NotificationService.notifyFaculty(request, 'Fund Request Approved', 'Your request has been approved.', 'SUCCESS', '/faculty/request-funds');
    } catch (e) {}

    safeEmit('finance', 'finance:update', { type: 'APPROVAL', requestId: request.id, timestamp: Date.now() });

    return res.json({ success: true, data: request });
});

const rejectFundRequest = asyncHandler(async (req, res) => {
    const request = await FundRequest.findByPk(req.params.id);
    if (!request) return res.status(200).json({ success: false, message: 'Request not found', data: [] });

    await request.update({ status: 'REJECTED' });

    try {
        await NotificationService.notifyFaculty(request, 'Fund Request Rejected', `Reason: ${req.body.remarks || 'N/A'}`, 'ALERT', '/faculty/request-funds');
    } catch (e) {}

    return res.json({ success: true, data: request });
});

const disburseFund = asyncHandler(async (req, res) => {
    const request = await FundRequest.findByPk(req.params.id);
    if (!request) return res.status(200).json({ success: false, message: 'Request not found', data: [] });

    if (request.status !== 'APPROVED') {
        return res.status(200).json({ success: false, message: 'Request must be approved first', data: [] });
    }

    const payload = {
        transactionId: req.body.transactionId || null,
        paymentMode: req.body.paymentMode || 'CHEQUE',
        amount: safeNumber(request.requestedAmount)
    };

    await disbursementQueue.add("disburse", {
        requestId: request.id || request._id,
        userId: req.user?.id || req.user?._id,
        payload
    });

    return res.status(202).json({ success: true, message: 'Disbursement queued' });
});

const getProjectWithInstallments = asyncHandler(async (req, res) => {
    const project = await Project.findByPk(req.params.projectId);
    if (!project) return res.status(200).json({ success: false, message: 'Project not found', data: [] });

    const installments = safeArray(await FundRequest.findAll({
        where: { projectId: project.id || project._id },
        include: [{ model: Disbursement, as: 'Disbursement', required: false }],
        order: [['installmentNumber', 'ASC']],
    }));

    const disbursedAmount = safeNumber(await Disbursement.sum('amount', { where: { projectId: project.id || project._id } }));

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

module.exports = {
    getFundRequests,
    getFundRequest,
    createFundRequest,
    updateFundRequest,
    approveFundRequest,
    rejectFundRequest,
    disburseFund,
    getProjectWithInstallments
};
