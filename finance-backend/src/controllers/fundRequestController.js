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
const { FUND_FLOW_STAGES } = require('../models/FundRequest');
const { Op } = require('sequelize');
const NotificationService = require('../services/notificationService');
const {
    buildCentreInclude,
    buildProjectInclude,
    normalizeFundRequest,
} = require('../services/pipelineMetricsService');
const {
    approveFundRequestPipeline,
    executeDisbursementPipeline,
} = require('../services/financePipelineService');
const { normalizeFundSource } = require('../services/fundSourceCatalogService');
const { VALID_PROJECT_STATUSES } = require('../constants/financeConstants');
const {
    getResearchCenterName,
    isResearchCenterFailure,
    normalizeResearchCenterResponse,
    normalizeResearchCenterResponseList,
} = require('../utils/researchCenterSafety');
const { safeEmit } = require('../socketInstance');

const ResearchCenterModel = ResearchCenter || Centre;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const resolveCentreAssignment = async (project, user) => {
    const hasCentreModel = !!ResearchCenterModel;

    if (project?.centreId && hasCentreModel) {
        return {
            centreId: project.centreId,
            centre: getResearchCenterName(project, project.centre || user?.centre || 'Research Centre'),
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
        if (user?.centre && hasCentreModel) {
            const centre = await ResearchCenterModel.findOne({ where: { name: user.centre } });
            if (centre) return { centreId: centre._id || centre.id, centre: centre.name };
            return { centreId: null, centre: user.centre };
        }
    } catch (error) {
        logger.warn('[FundRequestController] ResearchCenter lookup failed:', error.message);
    }

    return { centreId: null, centre: project?.centre || user?.centre || 'Research Centre' };
};

const computeRemaining = async (project) => {
    const total = Number(project.sanctionedBudget || 0);
    const projectId = project._id || project.id;
    const disbursed = Number(await Disbursement.sum('amount', {
        where: { projectId }
    }) || 0);
    return Math.max(0, total - disbursed);
};

const nextInstallmentNumber = async (projectId) => {
    if (!projectId) return 1;
    const count = await FundRequest.count({
        where: {
            projectId,
            status: { [Op.ne]: 'REJECTED' },
        },
    });
    return count + 1;
};

// ─── READ ──────────────────────────────────────────────────────────────────────

const safe = require('../utils/safeController');

const getFundRequests = safe(async () => {
  return await FundRequest.findAll({
    include: []
  });
});

const getFundRequest = asyncHandler(async (req, res) => {
    let request;
    try {
        request = await FundRequest.findByPk(req.params.id, {
            include: [
                buildCentreInclude(), 
                buildProjectInclude(),
                { model: Disbursement, as: 'Disbursement', required: false }
            ].filter(Boolean),
        });
    } catch (error) {
        logger.warn('[FundRequestController] getFundRequest include failed:', error.message);
        request = await FundRequest.findByPk(req.params.id, {
            include: [buildProjectInclude({ includeResearchCenter: false })],
        });
    }
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    return res.status(200).json({ success: true, data: normalizeResearchCenterResponse(normalizeFundRequest(request)) || {} });
});

const createFundRequest = asyncHandler(async (req, res) => {
    const facultyId = req.user.id || req.user._id;
    const {
        projectTitle, requestedAmount, purpose, source, totalBudget,
        projectId: bodyProjectId,
        projectRef,
    } = req.body;
    const bodyProjectIdResolved = bodyProjectId || projectRef || null;
    const amount = Number(requestedAmount);

    // ── 1. Idempotency guard ────────────────────────────────────────────
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const duplicate = await FundRequest.findOne({
        where: {
            facultyId,
            projectTitle,
            requestedAmount: amount,
            createdAt: { [Op.gte]: fiveMinutesAgo },
        },
    });
    if (duplicate) {
        return res.status(400).json({
            success: false,
            message: 'A duplicate request was submitted in the last 5 minutes. Please wait.',
        });
    }

    const transaction = await FundRequest.sequelize.transaction();

    try {
        // ── 2. Resolve / auto-create project ───────────────────────────────
        const standardizedSource = normalizeFundSource(source || 'PFMS');
        let project = null;

        if (bodyProjectIdResolved) {
            project = await Project.findByPk(bodyProjectIdResolved, { transaction });
        }
        if (!project) {
            project = await Project.findOne({
                where: {
                    [Op.or]: [
                        { title: projectTitle },
                        { pi: req.user.name, title: projectTitle },
                    ],
                },
                transaction
            });
        }

        if (!project) {
            const centreAssignment = await resolveCentreAssignment(null, req.user);
            const totalSanctioned = Number(totalBudget || amount);
            project = await Project.create({
                title: projectTitle,
                pi: req.user.name,
                userId: facultyId,
                facultyId,
                sanctionedBudget: totalSanctioned,
                releasedBudget: 0,
                utilizedBudget: 0,
                status: 'PENDING',
                department: req.user.department || 'RESEARCH',
                centre: centreAssignment.centre,
                centreId: centreAssignment.centreId,
                fundingSource: standardizedSource,
                description: purpose || `Auto-created for fund request: ${projectTitle}`,
            }, { transaction });
        }

        if (!project) {
            return res.status(404).json({ success: false, message: 'Target project not found' });
        }

        // --- HARD BLOCK: FROZEN PROJECTS ---
        if (project.status === 'FROZEN') {
            await transaction.rollback();
            return res.status(403).json({
                success: false,
                message: 'This project has been FROZEN by Administration. Fund requests are temporarily suspended.',
                status: 'FROZEN'
            });
        }

        const projectId = project._id || project.id;

        // ── 3. Budget enforcement ───────────────────────────────────────────
        const totalReleased = await Disbursement.sum('amount', {
            where: { projectId },
            transaction
        }) || 0;

        const totalRequestedPending = await FundRequest.sum('requestedAmount', {
            where: {
                projectId,
            status: ['PENDING', 'APPROVED']
            },
            transaction
        }) || 0;

        const sanctionedBudget = Number(project.sanctionedBudget || 0);
        const remaining = sanctionedBudget - totalReleased - totalRequestedPending;

        if (amount > remaining) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: `Requested amount ₹${amount.toLocaleString()} exceeds remaining project budget ₹${remaining.toLocaleString()}.`,
                data: {
                    totalAmount: sanctionedBudget,
                    disbursedAmount: totalReleased,
                    pendingAmount: totalRequestedPending,
                    remainingAmount: remaining,
                },
            });
        }

        // ── 4. Installment number ───────────────────────────────────────────
        const maxInstallment = await FundRequest.max('installmentNumber', {
            where: { projectId },
            transaction,
            lock: transaction.LOCK.UPDATE
        });
        const installmentNumber = (maxInstallment || 0) + 1;

        // ── 5. Create fund request ──────────────────────────────────────────
        const centreAssignment = await resolveCentreAssignment(project, req.user);
        const fundRequest = await FundRequest.create({
            projectTitle,
            projectId,
            faculty: req.user.name,
            facultyId,
            userId: facultyId,
            requestedAmount: amount,
            installmentNumber,
            type: 'INSTALLMENT',
            purpose,
            department: req.user.department || 'RESEARCH',
            centre: centreAssignment.centre,
            centreId: centreAssignment.centreId,
            source: standardizedSource,
            status: 'PENDING',
        }, { transaction });

        await AuditLog.create({
            userId: req.user.id || req.user._id,
            action: 'FUND_REQUEST_CREATED',
            entityType: 'FundRequest',
            entityId: String(fundRequest.id || fundRequest._id),
            metadata: { projectTitle, amount }
        }, { transaction });

        await transaction.commit();

        // ── 6. Notify Admin ─────────────────────────────────────────────────
        try {
            await NotificationService.notifyRole(
                'ADMIN',
                'New Fund Request',
                `${req.user.name} submitted installment #${installmentNumber} for '${projectTitle}' — ₹${amount.toLocaleString()}.`,
                'INFO',
                `/admin/fund-requests`
            );
        } catch (err) {
            logger.error('[Notification Failed]', err);
        }

        // Fetch full request to return properly populated object
        let fullRequest;
        try {
            fullRequest = await FundRequest.findByPk(fundRequest.id || fundRequest._id, {
                include: [
                    buildCentreInclude(), 
                    buildProjectInclude()
                ].filter(Boolean),
            });
        } catch (err) {
            fullRequest = fundRequest;
        }

        return res.status(201).json({ success: true, data: normalizeResearchCenterResponse(normalizeFundRequest(fullRequest)) || fullRequest || {} });
    } catch (error) {
        await transaction.rollback();
        logger.error('[FundRequestController] createFundRequest Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create fund request',
            error: error.message
        });
    }
});

const updateFundRequest = asyncHandler(async (req, res) => {
    const request = await FundRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (req.body.documents) request.documents = req.body.documents;
    if (req.body.currentStage) request.currentStage = req.body.currentStage;

    await request.save();
    return res.status(200).json({ success: true, data: request || {} });
});

const approveFundRequest = asyncHandler(async (req, res) => {
    const request = await FundRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found', correlationId: req.correlationId });

    if (request.status !== 'PENDING') {
        return res.status(400).json({
            success: false,
            message: `Cannot approve a request with status '${request.status}'. Only PENDING requests can be approved.`,
            correlationId: req.correlationId
        });
    }

    await approveFundRequestPipeline(request, req.user, req.body.remarks);

    await NotificationService.notifyFaculty(
        request,
        'Fund Request Approved',
        `Your installment #${request.installmentNumber || 1} for '${request.projectTitle}' has been approved and sent to Finance for disbursement.`,
        'SUCCESS',
        '/faculty/request-funds'
    );

    await NotificationService.notifyRole(
        'FINANCE_OFFICER',
        'Disbursement Required',
        `Admin approved installment #${request.installmentNumber || 1} (₹${request.requestedAmount?.toLocaleString()}) for '${request.projectTitle}'. Please disburse.`,
        'INFO',
        '/finance/disbursements'
    );

    await AuditLog.create({
        userId: req.user.id || req.user._id,
        action: 'FUND_REQUEST_APPROVED',
        entityType: 'FundRequest',
        entityId: String(request.id),
        metadata: { remarks: req.body.remarks }
    });

    safeEmit('finance', 'finance:update', {
        type: 'APPROVAL',
        requestId: request._id || request.id,
        projectTitle: request.projectTitle,
        updatedBy: req.user?.name,
        timestamp: Date.now()
    });

    return res.status(200).json({ success: true, data: request || {} });
});

const rejectFundRequest = asyncHandler(async (req, res) => {
    const request = await FundRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    await request.update({
        status: 'REJECTED'
    });

    await NotificationService.notifyFaculty(
        request,
        'Fund Request Rejected',
        `Your installment #${request.installmentNumber || 1} for '${request.projectTitle}' was rejected. Reason: ${req.body.remarks || 'N/A'}`,
        'ALERT',
        '/faculty/request-funds'
    );

    await AuditLog.create({
        userId: req.user.id || req.user._id,
        action: 'FUND_REQUEST_REJECTED',
        entityType: 'FundRequest',
        entityId: String(request.id),
        metadata: { remarks: req.body.remarks }
    });

    safeEmit('finance', 'finance:update', {
        type: 'REJECTION',
        requestId: request._id || request.id,
        projectTitle: request.projectTitle,
        updatedBy: req.user?.name,
        timestamp: Date.now()
    });

    return res.status(200).json({ success: true, data: request || {} });
});

const disburseFund = asyncHandler(async (req, res) => {
    const request = await FundRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    // Only APPROVED is valid
    if (request.status !== 'APPROVED') {
        if (request.status === 'DISBURSED' && req.body.transactionId) {
            const existing = await Disbursement.findOne({
                where: {
                    fundRequestId: request._id || request.id,
                    bankReference: req.body.transactionId
                }
            });
            if (existing) {
                return res.status(200).json({
                    success: true,
                    message: 'Disbursement already processed (Idempotent)',
                    data: request,
                    disbursement: existing
                });
            }
        }
        return res.status(400).json({
            success: false,
            message: `Cannot disburse a request in '${request.status}' status. Only APPROVED requests can be disbursed.`,
            correlationId: req.correlationId
        });
    }

    // Check DB AuditLog for approval
    const approvalLog = await AuditLog.findOne({
        where: {
            entityId: String(request._id || request.id),
            action: { [Op.in]: ['FUND_REQUEST_APPROVED', 'FUND_APPROVED'] }
        }
    });

    if (!approvalLog) {
        return res.status(400).json({
            success: false,
            message: 'No valid approval record found. This request must be approved before disbursement.',
            correlationId: req.correlationId
        });
    }

    if (req.body.transactionId) {
        const duplicateTransaction = await Disbursement.findOne({
            where: { bankReference: req.body.transactionId }
        });
        if (duplicateTransaction) {
            return res.status(409).json({
                success: false,
                message: 'A disbursement with this transaction ID (UTR) already exists.',
                correlationId: req.correlationId
            });
        }
    }

    // Amount is ALWAYS the full requestedAmount — no partial override
    const disbursementAmount = Number(request.requestedAmount);
    if (!Number.isFinite(disbursementAmount) || disbursementAmount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Request has invalid requestedAmount.',
            correlationId: req.correlationId
        });
    }

    const payload = {
        transactionId: req.body.transactionId || null,
        bankName: req.body.bankName || null,
        chequeNumber: req.body.chequeNumber || null,
        paymentMode: req.body.paymentMode || 'CHEQUE',
        proofUrl: req.file ? `/uploads/${req.file.filename}` : null,
        disbursementDate: req.body.disbursementDate || new Date(),
        remarks: req.body.remarks || null,
        amount: disbursementAmount
    };

    // Use queue instead of direct execution
    await disbursementQueue.add("disburse", {
        requestId: request.id || request._id,
        userId: req.user.id || req.user._id,
        payload,
        correlationId: req.correlationId
    }, {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
    });

    return res.status(202).json({
        success: true,
        message: 'Disbursement request has been queued successfully for processing.',
        correlationId: req.correlationId
    });
});

const advanceStage = asyncHandler(async (req, res) => {
    const { nextStage, remarks } = req.body;
    const request = await FundRequest.findByPk(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

    if (
        req.user.role !== 'FINANCE_OFFICER' &&
        req.user.role !== 'ADMIN' &&
        nextStage !== 'UTILIZATION_COMPLETED'
    ) {
        return res.status(403).json({ success: false, message: 'Only Admin or Finance Officer can advance this stage' });
    }

    if (nextStage === 'UTILIZATION_COMPLETED' && req.user.role !== 'FACULTY') {
        return res.status(403).json({ success: false, message: 'Only PI can submit utilization' });
    }

    await request.advanceStage(nextStage, { _id: req.user.id || req.user._id, name: req.user.name }, remarks);

    if (nextStage === 'UTILIZATION_COMPLETED') {
        await NotificationService.notifyRole('ADMIN', 'Utilization Submitted',
            `${request.faculty} submitted utilization for '${request.projectTitle}'.`, 'INFO', '/admin/fund-requests');
        await NotificationService.notifyRole('FINANCE_OFFICER', 'Utilization for Verification',
            `Utilization report for '${request.projectTitle}' is ready for verification.`, 'INFO', '/finance/settlements');
    } else if (nextStage === 'SETTLEMENT_CLOSED') {
        await NotificationService.notifyFaculty(request, 'Settlement Closed',
            `Your settlement for '${request.projectTitle}' has been verified and closed.`, 'SUCCESS', '/faculty/request-funds');
    } else if (['FUND_RELEASED', 'CHEQUE_RELEASED', 'AMOUNT_DISBURSED'].includes(nextStage)) {
        await NotificationService.notifyFaculty(request, 'Fund Stage Updated',
            `Your fund request for '${request.projectTitle}' moved to: ${nextStage.replace(/_/g, ' ')}.`, 'INFO', '/faculty/request-funds');
    }

    // Removed duplicate project.releasedBudget update. Handled authoritatively by executeDisbursementPipeline.

    if (nextStage === 'SETTLEMENT_CLOSED') {
        const project = request.projectId
            ? await Project.findByPk(request.projectId)
            : await Project.findOne({ where: { title: request.projectTitle } });
        if (project) {
            await project.update({
                utilizedBudget: Number(project.utilizedBudget || 0) + Number(request.requestedAmount),
            });
        }
    }

    safeEmit('finance', 'finance:update', {
        type: 'STAGE_UPDATE',
        requestId: request._id || request.id,
        projectTitle: request.projectTitle,
        nextStage,
        updatedBy: req.user?.name,
        timestamp: Date.now()
    });

    return res.status(200).json({ success: true, data: request || {} });
});

const getProjectWithInstallments = asyncHandler(async (req, res) => {
    let project;
    try {
        project = await Project.findByPk(req.params.projectId, {
            include: [buildCentreInclude()].filter(Boolean),
        });
    } catch (error) {
        logger.warn('[FundRequestController] getProjectWithInstallments include failed:', error.message);
        project = await Project.findByPk(req.params.projectId);
    }
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    if (
        req.user.role === 'FACULTY' &&
        project.facultyId !== (req.user.id || req.user._id) &&
        project.userId !== (req.user.id || req.user._id)
    ) {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const installments = await FundRequest.findAll({
        where: { projectId: project._id || project.id },
        include: [{ required: false, model: Disbursement, as: 'Disbursement', required: false }],
        order: [['installmentNumber', 'ASC'], ['createdAt', 'ASC']],
    });

    const totalAmount = Number(project.sanctionedBudget || 0);
    const disbursedAmount = Number(await Disbursement.sum('amount', {
        where: { projectId: project._id || project.id }
    }) || 0);
    const remainingAmount = Math.max(0, totalAmount - disbursedAmount);

    return res.status(200).json({
        success: true,
        data: {
            project: {
                ...normalizeResearchCenterResponse(project),
                totalAmount,
                disbursedAmount,
                remainingAmount,
            },
            installments: normalizeResearchCenterResponseList((installments || []).map((r) => normalizeFundRequest(r))),
            count: installments?.length || 0,
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
    advanceStage,
    getProjectWithInstallments
};
