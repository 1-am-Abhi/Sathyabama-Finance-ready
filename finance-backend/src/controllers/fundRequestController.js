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

exports.getFundRequests = async (req, res) => {
    try {
        const options = {
            order: [['createdAt', 'DESC']],
            include: [],
        };

        try {
            const centreInc = buildCentreInclude();
            if (centreInc) options.include.push(centreInc);
        } catch (incErr) {
            console.warn('[getFundRequests] WARNING: buildCentreInclude failed. Details:', incErr.message);
        }

        try {
            const projectInc = buildProjectInclude();
            if (projectInc) options.include.push(projectInc);
        } catch (incErr) {
            console.warn('[getFundRequests] WARNING: buildProjectInclude failed. Details:', incErr.message);
        }

        if (req.user.role === 'FACULTY') {
            options.where = {
                [Op.or]: [
                    { facultyId: req.user.id || req.user._id },
                    { userId:    req.user.id || req.user._id },
                    { faculty:   req.user.name },
                ],
            };
        }

        console.log(`[getFundRequests] Executing query with ${options.include.length} includes`);
        const requests = await FundRequest.findAll(options);
        
        const data = [];
        requests.forEach((r) => {
            try {
                data.push(normalizeFundRequest(r));
            } catch (normErr) {
                console.error(`[getFundRequests] ERROR: Normalization failed for request ${r._id || r.id || 'unknown'}. Skipping record. Details:`, normErr.message);
            }
        });

        return res.status(200).json({ success: true, count: data.length, data });
    } catch (error) {
        console.error('[getFundRequests] FATAL: Database query or unexpected failure:', error.message);
        return serverError(res, error);
    }
};

exports.getFundRequest = async (req, res) => {
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

// ─── CREATE ────────────────────────────────────────────────────────────────────

/**
 * POST /fund-requests
 * Faculty submits an installment request for a project.
 *
 * Validations:
 *   1. Idempotency – no duplicate within 5 minutes
 *   2. Budget check – requestedAmount ≤ remainingAmount
 *   3. Installment number – auto-incremented per project
 */
exports.createFundRequest = async (req, res) => {
    try {
        const facultyId = req.user.id || req.user._id;
        const {
            projectTitle, requestedAmount, purpose, source, totalBudget,
            projectId: bodyProjectId,
            projectRef,   // frontend sends this field instead of projectId
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

        // Prefer explicit projectId/projectRef lookup
        if (bodyProjectIdResolved) {
            project = await Project.findByPk(bodyProjectIdResolved, { include: [buildCentreInclude()] });
        }
        // Fall back to title-based lookup
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
            // Auto-create project (first-time request from this faculty for this title)
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

        return res.status(201).json({ success: true, data: fundRequest });
    } catch (error) {
        return serverError(res, error);
    }
};

// ─── UPDATE (documents / stage patch by faculty) ──────────────────────────────

exports.updateFundRequest = async (req, res) => {
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

// ─── APPROVE (Admin) ──────────────────────────────────────────────────────────

/**
 * PUT /fund-requests/:id/approve  (also accessible via PATCH)
 * Admin approves a pending fund request → status becomes PENDING_DISBURSAL.
 * Notifies: Finance Officers + Faculty.
 */
exports.approveFundRequest = async (req, res) => {
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

        // Notify Faculty
        await NotificationService.notifyFaculty(
            request,
            'Fund Request Approved',
            `Your installment #${request.installmentNumber || 1} for '${request.projectTitle}' has been approved and sent to Finance for disbursement.`,
            'SUCCESS',
            '/faculty/request-funds'
        );

        // Notify Finance
        await NotificationService.notifyRole(
            'FINANCE_OFFICER',
            'Disbursement Required',
            `Admin approved installment #${request.installmentNumber || 1} (₹${request.requestedAmount?.toLocaleString()}) for '${request.projectTitle}'. Please disburse.`,
            'INFO',
            '/finance/disbursements'
        );

        return res.status(200).json({ success: true, data: request });
    } catch (error) {
        return serverError(res, error);
    }
};

// ─── REJECT (Admin) ───────────────────────────────────────────────────────────

exports.rejectFundRequest = async (req, res) => {
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

        return res.status(200).json({ success: true, data: request });
    } catch (error) {
        return serverError(res, error);
    }
};

// ─── DISBURSE (Finance Officer) ───────────────────────────────────────────────

/**
 * PATCH /fund-requests/:id/disburse
 * Finance Officer disburses an approved fund request.
 *
 * Validations:
 *   1. Status must be PENDING_DISBURSAL (approved by Admin)
 *   2. Prevent duplicate disbursement (Disbursement record must not exist)
 *
 * Side-effects (via executeDisbursementPipeline):
 *   • FundRequest status → DISBURSED, currentStage → AMOUNT_DISBURSED
 *   • Disbursement record created
 *   • Project.releasedBudget += amount   (disbursedAmount)
 *   • Ledger OUTFLOW entry created
 *
 * Notifies: Faculty
 */
exports.disburseFund = async (req, res) => {
    try {
        const request = await FundRequest.findByPk(req.params.id);
        if (!request) return res.status(404).json({ success: false, message: 'Request not found' });

        // ── Guard 1: must be approved ───────────────────────────────────────
        if (request.status !== 'PENDING_DISBURSAL') {
            return res.status(400).json({
                success: false,
                message: `Cannot disburse a request with status '${request.status}'. Only PENDING_DISBURSAL requests can be disbursed.`,
            });
        }

        // ── Guard 2: prevent duplicate disbursement ─────────────────────────
        const existing = await Disbursement.findOne({
            where: { fundRequestId: request._id || request.id },
        });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'This fund request has already been disbursed.',
            });
        }

        // ── Execute pipeline (creates Disbursement, updates Project, Ledger) ─
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

        // ── Compute updated project budget for response ─────────────────────
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

        // ── Notify Faculty ──────────────────────────────────────────────────
        await NotificationService.notifyFaculty(
            updatedRequest,
            'Funds Disbursed',
            `Installment #${updatedRequest.installmentNumber || 1} (₹${updatedRequest.requestedAmount?.toLocaleString()}) for '${updatedRequest.projectTitle}' has been disbursed to your account.`,
            'SUCCESS',
            '/faculty/request-funds'
        );

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

// ─── ADVANCE STAGE (Finance / Faculty – granular pipeline steps) ──────────────

/**
 * POST /fund-requests/:id/advance
 * Retained for backward compatibility with the granular stage pipeline
 * (FUND_RELEASED, BILLS_UPLOADED, CHEQUE_RELEASED, etc.)
 * The primary disbursal flow should use PATCH /:id/disburse above.
 */
exports.advanceStage = async (req, res) => {
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

        // Stage-based notifications
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

        // Sync project budgets if disbursed via stage pipeline
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

// ─── GET PROJECT WITH ALL INSTALLMENTS ────────────────────────────────────────

/**
 * GET /fund-requests/project/:projectId
 * Returns project budget summary + all fund requests (installments) for that project.
 * Used by faculty to track their installment cycle.
 */
exports.getProjectWithInstallments = async (req, res) => {
    try {
        const project = await Project.findByPk(req.params.projectId, {
            include: [buildCentreInclude()],
        });
        if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

        // Role guard: Faculty can only see their own projects
        if (
            req.user.role === 'FACULTY' &&
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
