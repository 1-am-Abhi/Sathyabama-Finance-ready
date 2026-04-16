/**
 * Fund Request Controller
 *
 * Installment-based fund workflow:
 *   Faculty → createFundRequest  → notifies Admin
 *   Admin   → approveFundRequest → notifies Finance
 *   Finance → disburseFund       → notifies Faculty
 *             (updates project disbursedAmount / remainingAmount)
 */

const { serverError } = require('../utils/controllerError');
const { FundRequest, FUND_FLOW_STAGES } = require('../models/FundRequest');
const Project = require('../models/Project');
const Disbursement = require('../models/Disbursement');
const AuditLog = require('../models/AuditLog');
const { Op } = require('sequelize');
const NotificationService = require('../services/notificationService');
const Centre = require('../models/Centre');
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
const asyncHandler = require('../utils/asyncHandler');


// ─── Helpers ──────────────────────────────────────────────────────────────────

const resolveCentreAssignment = async (project, user) => {
    if (project?.centreId) {
        return {
            centreId: project.centreId,
            centre: project.researchCentre?.name || project.centre || user?.centre || 'Research Centre',
        };
    }
    if (user?.centreId) {
        const centre = await Centre.findByPk(user.centreId);
        if (centre) return { centreId: centre._id || centre.id, centre: centre.name };
    }
    if (project?.centre) {
        const centre = await Centre.findOne({ where: { name: project.centre } });
        if (centre) return { centreId: centre._id || centre.id, centre: centre.name };
        return { centreId: null, centre: project.centre };
    }
    if (user?.centre) {
        const centre = await Centre.findOne({ where: { name: user.centre } });
        if (centre) return { centreId: centre._id || centre.id, centre: centre.name };
        return { centreId: null, centre: user.centre };
    }
    return { centreId: null, centre: 'Research Centre' };
};

/**
 * Compute remaining budget for a project.
 * remainingAmount = sanctionedBudget - releasedBudget
 */
const computeRemaining = (project) => {
    const total = Number(project.sanctionedBudget || 0);
    const disbursed = Number(project.releasedBudget || 0);
    return Math.max(0, total - disbursed);
};

/**
 * Get the next installment number for a project.
 * Counts all non-rejected fund requests for that project, then adds 1.
 */
const nextInstallmentNumber = async (projectId) => {
    if (!projectId) return 1;
    const count = await FundRequest.count({
        where: {
            projectId,
            status: { [Op.notIn]: ['REJECTED'] },
        },
    });
    return count + 1;
};

// ─── READ ──────────────────────────────────────────────────────────────────────

const getFundRequests = asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    
    const options = {
        order: [['createdAt', 'DESC']],
        limit,
        offset: (page - 1) * limit,
        include: [],
    };

    // Safely build includes
    try {
        const centreInc = buildCentreInclude();
        if (centreInc) options.include.push(centreInc);
        const projectInc = buildProjectInclude();
        if (projectInc) options.include.push(projectInc);
    } catch (incErr) {
        console.warn('[getFundRequests] Optional includes failed:', incErr.message);
    }

    if (req.user?.role === 'FACULTY') {
        const userId = req.user?.id || req.user?._id;
        options.where = {
            [Op.or]: [
                { facultyId: userId },
                { userId: userId },
                { faculty: req.user?.name },
            ],
        };
    }

    const { count, rows } = await FundRequest.findAndCountAll(options);
    
    const data = (rows || []).map(r => {
        try {
            return normalizeFundRequest(r);
        } catch (err) {
            return r.toJSON();
        }
    });

    return res.status(200).json({
        success: true,
        data: data || [],
        meta: {
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        }
    });
});

const getFundRequest = async (req, res) => {
    try {
        const request = await FundRequest.findByPk(req.params.id, {
            include: [buildCentreInclude(), buildProjectInclude()],
        });
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
        return res.status(200).json({ success: true, data: normalizeFundRequest(request) });
    } catch (error) {
        return serverError(res, error);
    }
};

const createFundRequest = async (req, res) => {
    try {
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

        // ── 2. Resolve / auto-create project ───────────────────────────────
        const standardizedSource = normalizeFundSource(source || 'PFMS');
        let project = null;

        if (bodyProjectIdResolved) {
            project = await Project.findByPk(bodyProjectIdResolved, { include: [buildCentreInclude()] });
        }
        if (!project) {
            project = await Project.findOne({
                where: {
                    [Op.or]: [
                        { title: projectTitle },
                        { pi: req.user.name, title: projectTitle },
                    ],
                },
                include: [buildCentreInclude()],
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
            });
        }

        const projectId = project._id || project.id;

        // ── 3. Budget enforcement ───────────────────────────────────────────
        const remaining = computeRemaining(project);
        if (amount > remaining) {
            return res.status(400).json({
                success: false,
                message: `Requested amount ₹${amount.toLocaleString()} exceeds remaining project budget ₹${remaining.toLocaleString()}.`,
                data: {
                    totalAmount: Number(project.sanctionedBudget),
                    disbursedAmount: Number(project.releasedBudget),
                    remainingAmount: remaining,
                },
            });
        }

        // ── 4. Installment number ───────────────────────────────────────────
        const installmentNumber = await nextInstallmentNumber(projectId);

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
            purpose,
            department: req.user.department || 'RESEARCH',
            centre: centreAssignment.centre,
            centreId: centreAssignment.centreId,
            source: standardizedSource,
            status: 'PENDING',
        });

        // ── 6. Notify Admin ─────────────────────────────────────────────────
        await NotificationService.notifyRole(
            'ADMIN',
            'New Fund Request',
            `${req.user.name} submitted installment #${installmentNumber} for '${projectTitle}' — ₹${amount.toLocaleString()}.`,
            'INFO',
            `/admin/fund-requests`
        );

        await AuditLog.create({
            userId: req.user.id || req.user._id,
            action: 'FUND_REQUEST_CREATED',
            entityType: 'FundRequest',
            entityId: String(fundRequest.id),
            metadata: { projectTitle, amount }
        });

        return res.status(201).json({ success: true, data: fundRequest });
    } catch (error) {
        return serverError(res, error);
    }
};

const updateFundRequest = async (req, res) => {
    try {
        const request = await FundRequest.findByPk(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

        if (req.body.documents) request.documents = req.body.documents;
        if (req.body.currentStage) request.currentStage = req.body.currentStage;

        await request.save();
        return res.status(200).json({ success: true, data: request });
    } catch (error) {
        return serverError(res, error);
    }
};

const approveFundRequest = async (req, res) => {
    try {
        const request = await FundRequest.findByPk(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

        if (request.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: `Cannot approve a request with status '${request.status}'. Only PENDING requests can be approved.`,
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

        return res.status(200).json({ success: true, data: request });
    } catch (error) {
        return serverError(res, error);
    }
};

const rejectFundRequest = async (req, res) => {
    try {
        const request = await FundRequest.findByPk(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

        const currentAudit = request.auditTrail || [];
        await request.update({
            status: 'REJECTED',
            auditTrail: [
                ...currentAudit,
                {
                    stage: 'REJECTED',
                    prevStage: request.currentStage,
                    updatedBy: req.user.id || req.user._id,
                    updatedByName: req.user.name,
                    timestamp: new Date(),
                    remarks: req.body.remarks || 'Rejected by Admin',
                },
            ],
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

        return res.status(200).json({ success: true, data: request });
    } catch (error) {
        return serverError(res, error);
    }
};

const disburseFund = async (req, res) => {
    try {
        const request = await FundRequest.findByPk(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

        if (request.status !== 'PENDING_DISBURSAL') {
            return res.status(400).json({
                success: false,
                message: `Cannot disburse a request with status '${request.status}'. Only PENDING_DISBURSAL requests can be disbursed.`,
            });
        }

        const existing = await Disbursement.findOne({
            where: { fundRequestId: request._id || request.id },
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'This fund request has already been disbursed.',
            });
        }

        const payload = {
            transactionId: req.body.transactionId || null,
            bankName: req.body.bankName || null,
            disbursementDate: req.body.disbursementDate || new Date(),
            remarks: req.body.remarks || null,
        };

        const { request: updatedRequest, disbursement } = await executeDisbursementPipeline(
            request,
            payload,
            req.user
        );

        let budgetSummary = null;
        if (updatedRequest.projectId) {
            const project = await Project.findByPk(updatedRequest.projectId);
            if (project) {
                const disbursedAmount = Number(project.releasedBudget || 0);
                const totalAmount = Number(project.sanctionedBudget || 0);
                budgetSummary = {
                    totalAmount,
                    disbursedAmount,
                    remainingAmount: Math.max(0, totalAmount - disbursedAmount),
                };
            }
        }

        await NotificationService.notifyFaculty(
            updatedRequest,
            'Funds Disbursed',
            `Installment #${updatedRequest.installmentNumber || 1} (₹${updatedRequest.requestedAmount?.toLocaleString()}) for '${updatedRequest.projectTitle}' has been disbursed to your account.`,
            'SUCCESS',
            '/faculty/request-funds'
        );

        await AuditLog.create({
            userId: req.user.id || req.user._id,
            action: 'FUND_REQUEST_DISBURSED',
            entityType: 'FundRequest',
            entityId: String(updatedRequest.id),
            metadata: { transactionId: payload.transactionId, amount: Number(updatedRequest.requestedAmount) }
        });

        return res.status(200).json({
            success: true,
            data: updatedRequest,
            disbursement,
            budgetSummary,
        });
    } catch (error) {
        return serverError(res, error);
    }
};

const advanceStage = async (req, res) => {
    try {
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

        if (nextStage === 'AMOUNT_DISBURSED') {
            const project = request.projectId
                ? await Project.findByPk(request.projectId)
                : await Project.findOne({ where: { title: request.projectTitle } });
            if (project) {
                await project.update({
                    releasedBudget: Number(project.releasedBudget || 0) + Number(request.requestedAmount),
                });
            }
        }

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

        return res.status(200).json({ success: true, data: request });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message });
    }
};

const getProjectWithInstallments = async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.projectId, {
            include: [buildCentreInclude()],
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        if (
            req.user.role !== 'FACULTY' &&
            project.facultyId !== (req.user.id || req.user._id) &&
            project.userId !== (req.user.id || req.user._id)
        ) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        const installments = await FundRequest.findAll({
            where: { projectId: project._id || project.id },
            order: [['installmentNumber', 'ASC'], ['createdAt', 'ASC']],
        });

        const totalAmount = Number(project.sanctionedBudget || 0);
        const disbursedAmount = Number(project.releasedBudget || 0);
        const remainingAmount = Math.max(0, totalAmount - disbursedAmount);

        return res.status(200).json({
            success: true,
            data: {
                project: {
                    ...project.toJSON(),
                    totalAmount,
                    disbursedAmount,
                    remainingAmount,
                },
                installments: installments.map((r) => normalizeFundRequest(r)),
                count: installments.length,
            },
        });
    } catch (error) {
        return serverError(res, error);
    }
};

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

