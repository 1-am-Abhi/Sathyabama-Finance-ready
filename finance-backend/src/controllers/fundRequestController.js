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
const { NON_REVERSED_DISBURSEMENT_WHERE } = require('../constants/financeConstants');
const {
    PROOF_TYPES,
    isGatingEnabled,
    isInstallmentVerified,
    evaluateProofs,
    normalizeDocs,
} = require('../utils/installmentProof');
const { FUND_FLOW_STAGES } = require('../models/FundRequest');

// Ensure a request's stage is at least `targetStage` without ever moving
// backwards (the stage machine is forward-only).
const ensureStageAtLeast = (request, targetStage) => {
    const cur = FUND_FLOW_STAGES.indexOf(request.currentStage);
    const target = FUND_FLOW_STAGES.indexOf(targetStage);
    if (target > cur) request.currentStage = targetStage;
};

const facultyOwns = (request, user) => {
    const ids = [user._id, user.id, user.userId].filter(Boolean).map(String);
    return ids.includes(String(request.userId)) || ids.includes(String(request.facultyId));
};
const { normalizeFundSource } = require('../services/fundSourceCatalogService');
const { safeEmit } = require('../socketInstance');
const { safeNumber, parseFY, safeArray } = require('../utils/safeUtils');

const ResearchCenterModel = ResearchCenter || Centre;
const PAYMENT_MODES = ['CHEQUE', 'NEFT', 'RTGS', 'UPI'];
const ROUNDING_TOLERANCE = 1;
const getRecordId = (record) => record?._id || record?.id || null;

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
        where: { projectId, organizationId, ...NON_REVERSED_DISBURSEMENT_WHERE }
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

  if (req.user?.role === 'FACULTY') where.facultyId = userId;

  if (req.query.status) {
    const statuses = String(req.query.status)
      .split(',')
      .map((status) => status.trim())
      .filter(Boolean);

    if (statuses.length === 1) where.status = statuses[0];
    else if (statuses.length > 1) where.status = { [Op.in]: statuses };
  }

  const baseInclude = [
    { model: Project, as: 'Project', required: false },
    { model: User, as: 'FacultyUser', attributes: ['name', 'department'], required: false }
  ];

  const disbursementInclude = { model: Disbursement, as: 'Disbursements', required: false };

  let rawRequests;
  try {
    rawRequests = await FundRequest.findAll({
      where,
      include: [...baseInclude, disbursementInclude],
      order: [['createdAt', 'DESC']]
    });
  } catch (error) {
    if (
      /Disbursements\.fundRequestId does not exist/i.test(error.message) ||
      /column .*fundRequestId.* does not exist/i.test(error.message)
    ) {
      logger.warn('FundRequestController fallback without Disbursements include', error.message);
      rawRequests = await FundRequest.findAll({
        where,
        include: baseInclude,
        order: [['createdAt', 'DESC']]
      });
    } else {
      throw error;
    }
  }

  const requests = safeArray(rawRequests);
  const data = requests.map((r) => normalizeFundRequest(r));
  return res.json({ success: true, count: data.length, data: safeArray(data) });
});

const getFundRequest = asyncHandler(async (req, res) => {
    const where = {
        organizationId: req.user.organizationId,
        _id: req.params.id
    };
    // Ownership guard (IDOR): faculty may only read their own requests.
    if ((req.user.role || '').toUpperCase() === 'FACULTY') {
        const facultyId = req.user._id || req.user.id;
        where[Op.or] = [{ userId: facultyId }, { facultyId }];
    }
    const request = await FundRequest.findOne({
        where,
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
    const facultyId = req.user?._id || req.user?.id;
    const orgId = req.user.organizationId;
    const {
        projectTitle, requestedAmount, purpose, source, totalBudget,
        projectId: bodyProjectId
    } = req.body;
    
    const amount = safeNumber(requestedAmount);

    if (!projectTitle || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Missing or invalid fields', data: null });
    }

    // 1. Resolve project (match either key — a project's id and _id can diverge)
    let project = null;
    if (bodyProjectId) {
        project = await Project.findOne({ where: { [Op.or]: [{ id: bodyProjectId }, { _id: bodyProjectId }], organizationId: orgId } });
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
    const installmentNumber = await nextInstallmentNumber(getRecordId(project), orgId);

    // 3a. Proof gating — the next installment cannot be requested until the
    // previous installment's utilization (bills/invoices + UC) has been verified
    // by Finance. Toggle with PROOF_GATING_ENABLED (default on).
    if (installmentNumber > 1 && isGatingEnabled()) {
        const previous = await FundRequest.findOne({
            where: {
                projectId: getRecordId(project),
                organizationId: orgId,
                status: { [Op.ne]: 'REJECTED' },
            },
            order: [['installmentNumber', 'DESC'], ['createdAt', 'DESC']],
        });
        if (previous && !isInstallmentVerified(previous)) {
            return res.status(409).json({
                success: false,
                code: 'PREVIOUS_INSTALLMENT_UNVERIFIED',
                message: `You cannot apply for the next installment yet. Installment #${previous.installmentNumber} must have its utilization (bills/invoices and Utilization Certificate) verified by Finance first.`,
                data: null,
            });
        }
    }

    const centreAssignment = await resolveCentreAssignment(project, req.user);

    const fundRequest = await FundRequest.create({
        projectTitle,
        projectId: getRecordId(project),
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
            _id: req.params.id
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
            _id: req.params.id
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

    safeEmit('finance', 'finance:update', { type: 'APPROVAL', requestId: getRecordId(request), timestamp: Date.now() });

    return res.json({ success: true, data: request });
});

const rejectFundRequest = asyncHandler(async (req, res) => {
    const request = await FundRequest.findOne({ 
        where: { 
            organizationId: req.user.organizationId,
            _id: req.params.id
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
            _id: req.params.id
        } 
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found', data: null });

    if (!['APPROVED', 'PARTIALLY_DISBURSED'].includes(request.status)) {
        return res.status(409).json({ success: false, message: 'Request must be approved first', data: null });
    }

    const totalDisbursed = safeNumber(await Disbursement.sum('amount', {
        where: { fundRequestId: getRecordId(request), organizationId: req.user.organizationId, ...NON_REVERSED_DISBURSEMENT_WHERE }
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
            requestId: getRecordId(request),
            userId: req.user?._id || req.user?.id,
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
            _id: req.params.projectId
        } 
    });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found', data: null });

    const installments = safeArray(await FundRequest.findAll({
        where: { projectId: getRecordId(project), organizationId: req.user.organizationId },
        include: [{ model: Disbursement, as: 'Disbursements', required: false }],
        order: [['installmentNumber', 'ASC']],
    }));

    const disbursedAmount = safeNumber(await Disbursement.sum('amount', { where: { projectId: getRecordId(project), organizationId: req.user.organizationId, ...NON_REVERSED_DISBURSEMENT_WHERE } }));

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
            _id: req.params.id
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

/**
 * POST /fund-requests/:id/proofs   (FACULTY)
 * Faculty uploads utilization proofs (bills/invoices/UC/supporting docs) for an
 * installment. Proofs are appended to FundRequest.documents and the stage is
 * advanced to BILLS_UPLOADED. Finance is notified to verify.
 */
const submitUtilizationProofs = asyncHandler(async (req, res) => {
    const request = await FundRequest.findOne({
        where: { organizationId: req.user.organizationId, _id: req.params.id },
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found', data: null });

    if ((req.user.role || '').toUpperCase() === 'FACULTY' && !facultyOwns(request, req.user)) {
        return res.status(403).json({ success: false, message: 'You can only submit proofs for your own requests', data: null });
    }

    const uploaderId = req.user._id || req.user.id;
    const incoming = normalizeDocs(req.body.documents).map((d) => ({
        type: String(d.type || PROOF_TYPES.SUPPORTING).toUpperCase(),
        url: d.url || d.path || d.fileUrl,
        name: d.name || 'document',
    }));

    if (req.file?.path) {
        incoming.push({
            type: String(req.body.proofType || PROOF_TYPES.BILL).toUpperCase(),
            url: req.file.path,
            name: req.file.originalname || 'proof',
        });
    }

    const cleaned = incoming
        .filter((d) => d.url)
        .map((d) => ({ ...d, uploadedAt: new Date(), uploadedBy: uploaderId }));

    if (!cleaned.length) {
        return res.status(400).json({ success: false, message: 'No proof documents provided', data: null });
    }

    request.documents = [...normalizeDocs(request.documents), ...cleaned];
    ensureStageAtLeast(request, 'BILLS_UPLOADED');
    await request.save();

    try {
        await NotificationService.notifyRole(
            'FINANCE_OFFICER',
            'Utilization Proofs Submitted',
            `${req.user?.name || 'A faculty member'} uploaded proofs for installment #${request.installmentNumber} of '${request.projectTitle}'. Please verify.`,
            'INFO',
            '/finance/disbursements'
        );
    } catch (e) { logger.warn('[proofs] notify finance failed:', e.message); }

    safeEmit('finance', 'finance:update', { type: 'PROOFS_SUBMITTED', requestId: getRecordId(request), timestamp: Date.now() });
    return res.json({ success: true, data: normalizeFundRequest(request) });
});

/**
 * POST /fund-requests/:id/verify-utilization   (FINANCE_OFFICER / ADMIN)
 * Finance verifies an installment's utilization. Requires a Bill/Invoice AND a
 * Utilization Certificate to be present; otherwise it is held for correction.
 * On success the stage advances to UTILIZATION_COMPLETED, unlocking the next
 * installment request for the faculty.
 */
const verifyUtilization = asyncHandler(async (req, res) => {
    const request = await FundRequest.findOne({
        where: { organizationId: req.user.organizationId, _id: req.params.id },
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found', data: null });

    const proofs = evaluateProofs(request.documents);
    if (!proofs.ok) {
        return res.status(400).json({
            success: false,
            code: 'PROOFS_INCOMPLETE',
            message: `Cannot verify utilization — held for correction. Missing: ${proofs.missing.join(', ')}.`,
            data: { missing: proofs.missing },
        });
    }

    ensureStageAtLeast(request, 'UTILIZATION_COMPLETED');
    if (req.body.remarks) request.financeRemarks = req.body.remarks;
    await request.save();

    try {
        await AuditLog.create({
            userId: req.user._id || req.user.id,
            action: 'UTILIZATION_VERIFIED',
            entityType: 'FundRequest',
            entityId: String(request.id),
            organizationId: request.organizationId,
            metadata: { installmentNumber: request.installmentNumber },
        });
    } catch (e) { logger.warn('[verifyUtilization] audit failed:', e.message); }

    try {
        await NotificationService.create(
            request.userId || request.facultyId,
            'Utilization Verified',
            `Your utilization for installment #${request.installmentNumber} of '${request.projectTitle}' has been verified. You may now apply for the next installment.`,
            'SUCCESS',
            '/faculty/request-funds'
        );
    } catch (e) { logger.warn('[verifyUtilization] notify faculty failed:', e.message); }

    safeEmit('finance', 'finance:update', { type: 'UTILIZATION_VERIFIED', requestId: getRecordId(request), timestamp: Date.now() });
    return res.json({ success: true, data: normalizeFundRequest(request) });
});

/**
 * POST /fund-requests/:id/return-for-correction   (FINANCE_OFFICER / ADMIN)
 * Explicitly bounce an installment's proofs back to the faculty with remarks.
 */
const returnForCorrection = asyncHandler(async (req, res) => {
    const request = await FundRequest.findOne({
        where: { organizationId: req.user.organizationId, _id: req.params.id },
    });
    if (!request) return res.status(404).json({ success: false, message: 'Request not found', data: null });

    const remarks = (req.body.remarks || 'Please re-upload complete and valid proofs (bills/invoices and Utilization Certificate).').toString();
    request.financeRemarks = remarks;
    await request.save();

    try {
        await NotificationService.create(
            request.userId || request.facultyId,
            'Proofs Returned for Correction',
            `Finance returned installment #${request.installmentNumber} of '${request.projectTitle}' for correction: ${remarks}`,
            'ALERT',
            '/faculty/request-funds'
        );
    } catch (e) { logger.warn('[returnForCorrection] notify faculty failed:', e.message); }

    return res.json({ success: true, data: normalizeFundRequest(request) });
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
    advanceStage,
    submitUtilizationProofs,
    verifyUtilization,
    returnForCorrection,
};
