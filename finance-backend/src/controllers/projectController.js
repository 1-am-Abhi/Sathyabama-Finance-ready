const logger = require('../utils/logger');
const { Op } = require('sequelize');
const asyncHandler = require('../utils/asyncHandler');
const {
    Project,
    User,
    ProjectMember,
    FundRequest,
    Disbursement,
    ResearchCenter,
    Centre,
    Ledger,
    sequelize
} = require('../models');
const { NON_REVERSED_DISBURSEMENT_WHERE } = require('../constants/financeConstants');

// Derive a project end date. Prefer an explicit endDate; otherwise add the
// entered duration (in whole years) to the start date. Returns a YYYY-MM-DD
// string (DATEONLY) or null.
const computeProjectEndDate = (startDate, endDate, duration) => {
    if (endDate) return endDate;
    const years = Number(duration);
    if (!startDate || !Number.isFinite(years) || years <= 0) return null;
    const d = new Date(startDate);
    if (isNaN(d.getTime())) return null;
    d.setFullYear(d.getFullYear() + Math.round(years));
    return d.toISOString().slice(0, 10);
};

// Single source of truth for "released" per project: SUM of non-reversed
// disbursements keyed by projectId (disbursements store the project's `id`).
const computeReleasedByProject = async (projectIds, organizationId) => {
    const map = {};
    const ids = (projectIds || []).filter(Boolean);
    if (!ids.length) return map;
    const rows = await Disbursement.findAll({
        where: { projectId: { [Op.in]: ids }, organizationId, ...NON_REVERSED_DISBURSEMENT_WHERE },
        attributes: ['projectId', [sequelize.fn('SUM', sequelize.col('amount')), 'released']],
        group: ['projectId'],
        raw: true
    });
    rows.forEach((r) => { map[r.projectId] = Number(r.released) || 0; });
    return map;
};

// A Project's `id` (model PK) and `_id` (DB column) can diverge for rows created
// after the UUID hardening migration (the model doesn't populate `_id`, so the DB
// default generates a different UUID). The API only ever exposes `id`, so match on
// EITHER key to avoid spurious "Project not found" on newer projects.
const projectIdMatch = (id) => ({ [Op.or]: [{ id }, { _id: id }] });
const {
    getAdminDashboardData,
    getFacultyDashboardData,
} = require('../services/pipelineMetricsService');
const { normalizeFundSource } = require('../services/fundSourceCatalogService');
const { safeNumber, parseFY, safeArray } = require('../utils/safeUtils');
const NotificationService = require('../services/notificationService');

const ResearchCenterModel = ResearchCenter || Centre;

const getAdminStats = asyncHandler(async (req, res) => {
    const { financialYear } = req.query;
    let adminData;
    try {
        adminData = await getAdminDashboardData(financialYear);
    } catch (error) {
        logger.error('[ProjectController] admin stats fallback:', error.message);
        adminData = { data: {} };
    }
    const rawData = adminData?.data || {};

    return res.status(200).json({
        success: true,
        data: {
            totalProjects: safeNumber(rawData.totalProjects),
            totalAllocated: safeNumber(rawData.totalAllocated),
            used: safeNumber(rawData.used),
            remaining: safeNumber(rawData.remaining),
            utilization: safeNumber(rawData.utilization),
            centres: safeArray(rawData.centres),
            trend: safeArray(rawData.trend || rawData.monthlyData)
        }
    });
});

const getFacultyStats = asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.user?._id;
    const orgId = req.user.organizationId;

    // Single source of truth: the faculty's OWN projects + their non-reversed
    // disbursements. (The previous path via getFacultyDashboardData returned
    // totalAllocated: 0 and used a mismatched field name for released.)
    const projects = safeArray(await Project.findAll({
        where: { organizationId: orgId, facultyId: userId },
        attributes: ['id', 'sanctionedBudget', 'status']
    }));
    const releasedByProject = await computeReleasedByProject(projects.map((p) => p.id), orgId);

    const totalAllocated = projects.reduce((s, p) => s + safeNumber(p.sanctionedBudget), 0);
    const totalReleased = projects.reduce((s, p) => s + (releasedByProject[p.id] || 0), 0);
    const activeProjects = projects.filter(
        (p) => ['ACTIVE', 'APPROVED'].includes(String(p.status || '').toUpperCase())
    ).length;

    let activeRequests = 0;
    try {
        activeRequests = safeNumber(await FundRequest.count({
            where: {
                facultyId: userId,
                organizationId: orgId,
                status: { [Op.in]: ['PENDING', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_DISBURSED'] }
            }
        }));
    } catch (e) { logger.warn('[getFacultyStats] activeRequests count failed:', e.message); }

    return res.status(200).json({
        success: true,
        data: {
            totalProjects: projects.length,
            activeProjects,
            totalReleased,
            totalDisbursed: totalReleased,
            facultyDisbursed: totalReleased,
            totalAllocated,
            facultyApprovedFunds: totalAllocated,
            remaining: Math.max(0, totalAllocated - totalReleased),
            activeRequests,
            notifications: []
        }
    });
});

const getAllProjects = asyncHandler(async (req, res) => {
    const where = { organizationId: req.user.organizationId };

    if (req.user?.role === 'FACULTY') {
        where.facultyId = req.user?.id || req.user?._id;
    }

    const projects = safeArray(await Project.findAll({
        where,
        include: [
            { model: User, as: 'facultyOwner', attributes: ['name', 'department'], required: false },
            { model: ResearchCenterModel, as: 'researchCenter', required: false }
        ],
        order: [['createdAt', 'DESC']]
    }));

    // Attach the authoritative released/remaining derived from disbursements so
    // every portal (and the installment state machine) uses one source of truth.
    const releasedByProject = await computeReleasedByProject(
        projects.map((p) => p.id),
        req.user.organizationId
    );
    const data = projects.map((p) => {
        const j = p.toJSON();
        const released = releasedByProject[p.id] || 0;
        j.releasedBudget = released;
        j.remainingBudget = Math.max(0, safeNumber(j.sanctionedBudget) - released);
        return j;
    });

    return res.status(200).json({ success: true, data });
});

const getProjectDetails = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const project = await Project.findOne({
        where: { ...projectIdMatch(id), organizationId: req.user.organizationId },
        include: [
            { model: User, as: 'facultyOwner', attributes: ['name', 'email', 'department'], required: false },
            { model: ProjectMember, as: 'members', required: false },
            { model: FundRequest, as: 'fundRequests', required: false },
            { model: Disbursement, as: 'Disbursements', required: false }
        ]
    });

    if (!project) return res.status(404).json({ success: false, message: 'Project not found', data: null });

    const plain = project.toJSON();

    // Derive financials from the single source of truth (non-reversed disbursements).
    const disbursements = Array.isArray(plain.Disbursements) ? plain.Disbursements : [];
    const releasedAmount = disbursements
        .filter((d) => !d.isReversed && d.status !== 'REVERSED')
        .reduce((sum, d) => sum + safeNumber(d.amount), 0);
    const sanctionedBudget = safeNumber(plain.sanctionedBudget);
    const remainingAmount = Math.max(0, sanctionedBudget - releasedAmount);

    // Installment progress: verified (settled) installments over total requested.
    const installments = Array.isArray(plain.fundRequests) ? plain.fundRequests : [];
    const installmentsTotal = installments.length;
    const installmentsCompleted = installments.filter(
        (r) => ['UTILIZATION_COMPLETED', 'SETTLEMENT_CLOSED'].includes(r.currentStage)
    ).length;

    // Normalise dates to YYYY-MM-DD (columns are timestamps → Date objects) so the
    // UI renders clean dates and never an ISO blob or N/A when a value exists.
    const dateOnly = (v) => {
        if (!v) return null;
        const d = new Date(v);
        return isNaN(d.getTime()) ? String(v).slice(0, 10) : d.toISOString().slice(0, 10);
    };
    const startDate = dateOnly(plain.startDate);
    const endDate = dateOnly(plain.endDate);

    return res.status(200).json({
        success: true,
        data: {
            ...plain,
            startDate,
            endDate,
            // Sanction Date is the project start (date of sanction order). Fall back
            // to the creation date so the UI never shows N/A when a project exists.
            sanctionDate: startDate || dateOnly(plain.createdAt),
            sanctionedAmount: sanctionedBudget,
            releasedAmount,
            remainingAmount,
            installmentsTotal,
            installmentsCompleted,
            installmentProgress: `${installmentsCompleted}/${installmentsTotal}`,
        }
    });
});

const createProject = asyncHandler(async (req, res) => {
    const userId = req.user?.id || req.user?._id;
    const orgId = req.user.organizationId;
    const {
        title, sanctionedBudget, fundingSource, description, centreId,
        startDate, endDate, duration, projectType, publicationYear
    } = req.body;

    if (!title || safeNumber(sanctionedBudget) <= 0) {
        return res.status(400).json({ success: false, message: 'Title and valid budget are required', data: null });
    }

    // Sanction/start date is what the faculty enters; the project end date is
    // derived from the entered duration (in years) when not supplied explicitly.
    const resolvedStart = startDate || null;
    const resolvedEnd = computeProjectEndDate(resolvedStart, endDate, duration);

    const project = await Project.create({
        title,
        pi: req.user?.name || 'Unknown',
        facultyId: userId,
        organizationId: orgId,
        department: req.user?.department || 'RESEARCH',
        sanctionedBudget: safeNumber(sanctionedBudget),
        releasedBudget: 0,
        utilizedBudget: 0,
        fundingSource: normalizeFundSource(fundingSource || 'INSTITUTIONAL'),
        description,
        centreId,
        startDate: resolvedStart,
        endDate: resolvedEnd,
        projectType: projectType || 'PROJECT',
        publicationYear: publicationYear ? safeNumber(publicationYear) : null,
        status: 'PENDING'
    });

    // Business rule: the submitting faculty automatically becomes the Principal
    // Investigator. Record an explicit PI ProjectMember (admin can reassign later).
    try {
        await ProjectMember.create({ projectId: project.id, userId, role: 'PI' });
    } catch (e) {
        logger.warn('[createProject] PI member create failed:', e.message);
    }

    // Notify admins that a new project/proposal was submitted (only when a faculty
    // submits — an admin creating a project doesn't need to notify themselves).
    if ((req.user?.role || '').toUpperCase() === 'FACULTY') {
        try {
            await NotificationService.notifyRole(
                'ADMIN',
                'New Project Submitted',
                `${req.user?.name || 'A faculty member'} submitted the project "${title}" for review.`,
                'INFO',
                '/admin/approve-projects'
            );
        } catch (e) {
            logger.warn('[createProject] notify admin failed:', e.message);
        }
    }

    // A new project raises totalProjects on the shared dashboard — clear the
    // cache and broadcast so the Admin Dashboard reflects it without a reload.
    try {
        require('../services/dashboardService').clearDashboardCache();
        require('../socketInstance').safeEmit('finance', 'finance:update', {
            type: 'PROJECT_CREATED', projectId: project.id, timestamp: Date.now()
        });
    } catch (e) {
        logger.warn('[createProject] dashboard refresh broadcast failed:', e.message);
    }

    return res.status(201).json({ success: true, data: project });
});

const updateProject = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const project = await Project.findOne({ where: { ...projectIdMatch(id), organizationId: req.user.organizationId } });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found', data: null });

    const {
        status, sanctionedBudget, fundingSource, description,
        startDate, endDate, duration, projectType, publicationYear
    } = req.body;

    const statusChanged = status && status !== project.status;
    if (status) project.status = status;
    if (sanctionedBudget) project.sanctionedBudget = safeNumber(sanctionedBudget);
    if (fundingSource) project.fundingSource = normalizeFundSource(fundingSource);
    if (description) project.description = description;
    if (projectType) project.projectType = projectType;
    if (publicationYear) project.publicationYear = safeNumber(publicationYear);
    // Update timeline fields; recompute endDate from duration when start changes.
    if (startDate !== undefined) project.startDate = startDate || null;
    if (startDate !== undefined || endDate !== undefined || duration !== undefined) {
        const nextEnd = computeProjectEndDate(
            startDate !== undefined ? startDate : project.startDate,
            endDate,
            duration
        );
        if (nextEnd) project.endDate = nextEnd;
    }

    await project.save();

    // A project status change (e.g. approval PENDING → ACTIVE, or completion)
    // changes activeProjects/completedProjects on the shared dashboard. Clear the
    // cache and broadcast so the Admin Dashboard updates live, matching Finance.
    if (statusChanged) {
        try {
            require('../services/dashboardService').clearDashboardCache();
            require('../socketInstance').safeEmit('finance', 'finance:update', {
                type: 'PROJECT_STATUS', projectId: project.id, status: project.status, timestamp: Date.now()
            });
        } catch (e) {
            logger.warn('[updateProject] dashboard refresh broadcast failed:', e.message);
        }
    }
    return res.status(200).json({ success: true, data: project });
});

const deleteProject = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const project = await Project.findOne({ where: { ...projectIdMatch(id), organizationId: req.user.organizationId } });
    if (!project) return res.status(404).json({ success: false, message: 'Project not found', data: null });

    // Disbursements reference the project by its `id`; match either key.
    const disbursementCount = safeNumber(await Disbursement.count({ where: { projectId: project.id, organizationId: req.user.organizationId } }));
    if (disbursementCount > 0) {
        return res.status(409).json({ success: false, message: 'Cannot delete project with existing disbursements', data: null });
    }

    await project.destroy();
    return res.status(200).json({ success: true, message: 'Project deleted' });
});

const freezeProject = asyncHandler(async (req, res) => {
    req.body.status = 'FROZEN';
    return updateProject(req, res);
});

const unfreezeProject = asyncHandler(async (req, res) => {
    req.body.status = 'ACTIVE';
    return updateProject(req, res);
});

const getProjectMembers = asyncHandler(async (req, res) => {
    const members = safeArray(await ProjectMember.findAll({
        where: { projectId: req.params.id },
        include: [{ model: User, as: 'user', attributes: ['name', 'email', 'department'], required: false }]
    }));
    return res.status(200).json({ success: true, data: members });
});

const updateProjectMembers = asyncHandler(async (req, res) => {
    const members = safeArray(req.body.members || req.body.userIds).map((member) => ({
        projectId: req.params.id,
        userId: typeof member === 'string' ? member : member.userId,
        role: typeof member === 'object' ? (member.role || 'MEMBER') : 'MEMBER'
    })).filter((member) => member.userId);

    await ProjectMember.destroy({ where: { projectId: req.params.id } });
    const created = members.length ? await ProjectMember.bulkCreate(members) : [];
    return res.status(200).json({ success: true, data: created });
});

module.exports = {
    getAdminStats,
    getFacultyStats,
    getAllProjects,
    getProjects: getAllProjects,
    getProjectDetails,
    getProject: getProjectDetails,
    createProject,
    updateProject,
    deleteProject,
    freezeProject,
    unfreezeProject,
    getProjectMembers,
    updateProjectMembers
};
