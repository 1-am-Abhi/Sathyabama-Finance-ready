const logger = require('../utils/logger');
const { Op } = require('sequelize');
const models = require('../models');
const { VALID_PROJECT_STATUSES } = require('../constants/financeConstants');
const {
    buildResearchCenterInclude,
    buildResearchCenterIncludeArray,
    getResearchCenterName,
    getResearchCenterModel,
    isResearchCenterFailure,
} = require('../utils/researchCenterSafety');

const Centre = getResearchCenterModel();
const Project = models.Project;
const FundRequest = models.FundRequest;
const Disbursement = models.Disbursement;
const FundSource = models.FundSource;
const User = models.User;
const {
    ensureCanonicalFundSources,
    FUND_SOURCE_KEYS,
    normalizeFundSource,
    normalizeFundSourceType,
} = require('./fundSourceCatalogService');

const ALLOCATED_STATUSES = ['APPROVED', 'DISBURSED'];
const ACTIVE_PROJECT_STATUSES = VALID_PROJECT_STATUSES;
const FUND_SOURCE_LABELS = {
    PFMS: 'PFMS Funds',
    INSTITUTIONAL: "Director's Innovation Fund",
    OTHERS: 'Others / External Grants',
};

const getRecordId = (record) => record?._id || record?.id || null;

const toNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeName = (name) => (name || '').trim().toLowerCase().replace(/^centre\s+(for|of\s+excellence\s+for)\s+/i, '');

const getCurrentFY = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based: Jan=0, Feb=1, Mar=2, Apr=3
    
    // FY 2024-25 starts April 1, 2024.
    // If month is Jan/Feb/Mar (0,1,2), it belongs to previous year's FY.
    return month >= 3 
        ? `${year}-${year + 1}`
        : `${year - 1}-${year}`;
};

const getFYDateRange = (financialYear) => {
    const fy = financialYear || getCurrentFY();
    const [startYearStr, endYearStrShort] = fy.split('-');
    const startYear = parseInt(startYearStr);
    
    // April 1st 00:00:00 to March 31st 23:59:59
    const start = new Date(startYear, 3, 1, 0, 0, 0, 0); 
    const end = new Date(startYear + 1, 2, 31, 23, 59, 59, 999);
    
    return { start, end };
};

const getFundingTotals = async (dateRange = null) => {
    await ensureCanonicalFundSources();

    const disbursementFilter = dateRange ? {
        where: {
            disbursedAt: {
                [Op.between]: [dateRange.start, dateRange.end]
            }
        }
    } : {};

    const [allocated, usedAmount] = await Promise.all([
        FundSource.sum('totalAllocated'),
        Disbursement.sum('amount', disbursementFilter),
    ]);

    const totalAllocated = toNumber(allocated);
    const used = toNumber(usedAmount);
    const remaining = totalAllocated - used;

    logger.info("FINAL TOTALS:", { totalAllocated, used, remaining });

    return {
        totalAllocated,
        used,
        remaining,
        totalDisbursed: used,
        totalUsed: used,
    };
};

const runWithResearchCenterFallback = async (primaryQuery, fallbackQuery, fallbackValue = []) => {
    try {
        return await primaryQuery();
    } catch (error) {
        if (!isResearchCenterFailure(error)) {
            throw error;
        }

        logger.warn('[PipelineMetrics] ResearchCenter include failed, retrying without it:', error.message);

        if (!fallbackQuery) {
            return fallbackValue;
        }

        try {
            return await fallbackQuery();
        } catch (fallbackError) {
            logger.warn('[PipelineMetrics] ResearchCenter fallback failed:', fallbackError.message);
            return fallbackValue;
        }
    }
};

const getMonthlyAnalytics = async (dateRange) => {
    try {
        const query = {
            attributes: [
                [models.Sequelize.fn('DATE_TRUNC', 'month', models.Sequelize.col('disbursedAt')), 'month'],
                [models.Sequelize.fn('SUM', models.Sequelize.col('amount')), 'total']
            ],
            group: ['month'],
            order: [[models.Sequelize.fn('DATE_TRUNC', 'month', models.Sequelize.col('disbursedAt')), 'ASC']]
        };
        
        if (dateRange) {
            query.where = {
                disbursedAt: { [Op.between]: [dateRange.start, dateRange.end] }
            };
        }

        const data = await Disbursement.findAll(query);

        return data.map(d => ({
            month: new Date(d.get('month')).toLocaleString('default', { month: 'short' }),
            amount: toNumber(d.get('total'))
        }));
    } catch (err) {
        logger.error("Monthly analytics error:", err);
        return [];
    }
};

const getYoYGrowth = async (financialYear, currentUsed) => {
    try {
        const [startPart] = financialYear.split('-');
        const startYearInt = parseInt(startPart);
        const prevFY = `${startYearInt - 1}-${startYearInt}`;
        const prevRange = getFYDateRange(prevFY);
        
        if (!prevRange) return 0;
        
        const prevUsed = Number(await Disbursement.sum('amount', {
            where: {
                disbursedAt: { [Op.between]: [prevRange.start, prevRange.end] }
            }
        })) || 0;
        
        return prevUsed > 0 ? ((currentUsed - prevUsed) / prevUsed) * 100 : 0;
    } catch (err) {
        return 0;
    }
};

const buildCentreInclude = () => {
    return buildResearchCenterInclude({
        as: 'researchCenter',
        attributes: ['_id', 'name'],
        required: false,
    });
};

const buildProjectInclude = (options = {}) => {
    const {
        includeResearchCenter = true,
        required = false,
        statusFilter = VALID_PROJECT_STATUSES,
    } = options;

    const include = includeResearchCenter ? buildResearchCenterIncludeArray() : [];
    const projectInclude = {
        model: Project,
        as: 'Project',
        attributes: [
            '_id',
            'title',
            'pi',
            'department',
            'centre',
            'centreId',
            'researchCenterId',
            'fundingSource',
            'status',
            'sanctionedBudget',
            'releasedBudget',
            'utilizedBudget',
        ],
        required,
        include,
    };

    if (statusFilter) {
        projectInclude.where = { status: { [Op.in]: statusFilter } };
    }

    return projectInclude;
};

const normalizeProject = (project) => {
    if (!project) {
        return null;
    }

    const raw = project.toJSON ? project.toJSON() : project;
    return {
        ...raw,
        _id: raw._id || raw.id,
        id: raw._id || raw.id,
        title: raw.title || 'Untitled Project',
        researchCenterName: getResearchCenterName(raw, 'N/A'),
        centreName: getResearchCenterName(raw, raw.centre || null),
    };
};

const normalizeFundRequest = (request) => {
    if (!request) {
        return null;
    }

    const raw = request.toJSON ? request.toJSON() : request;
    const project = normalizeProject(raw.Project);
    const requestedAmount = toNumber(raw.requestedAmount ?? raw.amount);
    const releasedAmount = (raw.Disbursements || []).reduce((sum, d) => sum + toNumber(d.amount), 0);
    const remainingAmount = Math.max(0, requestedAmount - releasedAmount);

    return {
        ...raw,
        id: getRecordId(raw),
        amount: requestedAmount,
        requestedAmount,
        releasedAmount,
        remainingAmount,
        Project: project,
        projectTitle: project?.title || raw.projectTitle || null,
        faculty: project?.pi || raw.faculty || null,
        researchCenterName: getResearchCenterName(raw, project?.researchCenterName || 'N/A'),
        centreName:
            raw?.researchCenter?.name ||
            raw.researchCentre?.name ||
            project?.centreName ||
            raw.centre ||
            null,
    };
};

const normalizeDisbursement = (disbursement) => {
    if (!disbursement) {
        return null;
    }

    const raw = disbursement.toJSON ? disbursement.toJSON() : disbursement;
    const fundRequest = normalizeFundRequest(raw.FundRequest);
    const project = normalizeProject(raw.Project) || fundRequest?.Project || null;

    return {
        ...raw,
        id: getRecordId(raw),
        amount: toNumber(raw.amount),
        FundRequest: fundRequest,
        Project: project,
        projectTitle: project?.title || fundRequest?.projectTitle || null,
        faculty: project?.pi || fundRequest?.faculty || null,
    };
};

const buildCentreRegistry = (centres = []) => {
    const registry = new Map();
    const nameIndex = new Map();

    centres.forEach((centre) => {
        const raw = centre.toJSON ? centre.toJSON() : centre;
        const key = raw._id || raw.id || raw.name;
        const entry = {
            key,
            id: raw._id || raw.id || null,
            name: raw.name || 'Unassigned',
            totalProjects: 0,
            activeProjects: 0,
            totalBudget: 0,
            disbursed: 0,
        };

        registry.set(key, entry);
        nameIndex.set(normalizeName(entry.name), key);
    });

    return { registry, nameIndex };
};

const ensureCentreEntry = (identity, context) => {
    if (!identity) {
        if (!context.registry.has('unassigned')) {
            context.registry.set('unassigned', {
                key: 'unassigned',
                id: null,
                name: 'Unassigned',
                totalProjects: 0,
                activeProjects: 0,
                totalBudget: 0,
                disbursed: 0,
            });
        }
        return context.registry.get('unassigned');
    }

    if (context.registry.has(identity.key)) {
        return context.registry.get(identity.key);
    }

    const entry = {
        key: identity.key,
        id: identity.id || null,
        name: identity.name || 'Unassigned',
        totalProjects: 0,
        activeProjects: 0,
        totalBudget: 0,
        disbursed: 0,
    };

    context.registry.set(identity.key, entry);
    if (entry.name) {
        context.nameIndex.set(normalizeName(entry.name), identity.key);
    }

    return entry;
};

const resolveCentreIdentity = (record, context) => {
    if (!record) {
        return null;
    }

    const candidates = [
        record.researchCenter,
        record.researchCentre,
        record.Project?.researchCenter,
        record.Project?.researchCentre,
        record.FundRequest?.researchCenter,
        record.FundRequest?.researchCentre,
        record.Project?.Project?.researchCenter,
        record.Project?.Project?.researchCentre,
    ].filter((candidate) => candidate && typeof candidate === 'object');

    for (const candidate of candidates) {
        const key = candidate._id || candidate.id || candidate.name;
        if (key) {
            return {
                key,
                id: candidate._id || candidate.id || null,
                name: candidate.name || 'Unassigned',
            };
        }
    }

    const centreIds = [
        record.researchCenterId,
        record.centreId,
        record.Project?.researchCenterId,
        record.Project?.centreId,
        record.FundRequest?.researchCenterId,
        record.FundRequest?.centreId,
        record.FundRequest?.Project?.researchCenterId,
        record.FundRequest?.Project?.centreId,
    ].filter(Boolean);

    for (const centreId of centreIds) {
        if (context.registry.has(centreId)) {
            const centre = context.registry.get(centreId);
            return { key: centre.key, id: centre.id, name: centre.name };
        }
    }

    const centreNames = [
        record.centre,
        record.centreName,
        record.researchCenterName,
        record.Project?.centre,
        record.Project?.centreName,
        record.Project?.researchCenterName,
        record.FundRequest?.centre,
        record.FundRequest?.centreName,
        record.FundRequest?.researchCenterName,
        record.FundRequest?.Project?.centre,
    ].filter(Boolean);

    for (const name of centreNames) {
        const normalized = normalizeName(name);
        if (context.nameIndex.has(normalized)) {
            const key = context.nameIndex.get(normalized);
            const centre = context.registry.get(key);
            return { key: centre.key, id: centre.id, name: centre.name };
        }
    }

    const fallbackName = centreNames[0];
    if (fallbackName) {
        return {
            key: `name:${normalizeName(fallbackName)}`,
            id: null,
            name: fallbackName,
        };
    }

    return null;
};

const buildSourceStats = (fundRequests, disbursements, sourceMatchers) => {
    const sources = (Array.isArray(sourceMatchers) ? sourceMatchers : [sourceMatchers]).map((source) =>
        normalizeFundSource(source)
    );

    const allotted = fundRequests
        .filter(
            (request) =>
                sources.includes(normalizeFundSource(request.source)) &&
                ALLOCATED_STATUSES.includes(request.status)
        )
        .reduce((sum, request) => sum + toNumber(request.requestedAmount), 0);

    const consumed = disbursements
        .filter((entry) => sources.includes(normalizeFundSource(entry.FundRequest?.source)))
        .reduce((sum, entry) => sum + toNumber(entry.amount), 0);

    return {
        allotted,
        consumed,
        balance: Math.max(0, allotted - consumed),
    };
};

const buildDisbursedBySource = (disbursements = []) =>
    (disbursements || []).reduce((acc, entry) => {
        // SSOT: Use Project.fundingSource for disbursement totals
        const rawSource = entry?.Project?.fundingSource || entry?.FundRequest?.source || 'INSTITUTIONAL';
        const source = normalizeFundSource(rawSource);
        acc[source] = (acc[source] || 0) + toNumber(entry.amount);
        return acc;
    }, { INSTITUTIONAL: 0, PFMS: 0, OTHERS: 0 });

const buildFundSourceCards = (overview = {}) => ([
    {
        id: 'INSTITUTIONAL',
        name: 'INSTITUTIONAL',
        displayName: FUND_SOURCE_LABELS.INSTITUTIONAL,
        totalAllocated: toNumber(overview?.institutionalFunds?.totalAllocated),
        totalUsed: toNumber(overview?.institutionalFunds?.totalUsed),
        remainingBalance: toNumber(overview?.institutionalFunds?.remainingBalance),
    },
    {
        id: 'PFMS',
        name: 'PFMS',
        displayName: FUND_SOURCE_LABELS.PFMS,
        totalAllocated: toNumber(overview?.pfmsFunds?.totalAllocated),
        totalUsed: toNumber(overview?.pfmsFunds?.totalUsed),
        remainingBalance: toNumber(overview?.pfmsFunds?.remainingBalance),
    },
    {
        id: 'OTHERS',
        name: 'OTHERS',
        displayName: FUND_SOURCE_LABELS.OTHERS,
        totalAllocated: toNumber(overview?.othersFunds?.totalAllocated),
        totalUsed: toNumber(overview?.othersFunds?.totalUsed),
        remainingBalance: toNumber(overview?.othersFunds?.remainingBalance),
    },
]);

const getSharedPipelineData = async () => {
    await ensureCanonicalFundSources();

    const [centres, projects, fundRequests, disbursements, totalFaculty] = await Promise.all([
        Centre
            ? runWithResearchCenterFallback(
                () => Centre.findAll({ order: [['name', 'ASC']] }),
                async () => [],
                []
            )
            : Promise.resolve([]),
        runWithResearchCenterFallback(
            () =>
                Project.findAll({
                    attributes: ['_id', 'status', 'centreId', 'centre', 'fundingSource', 'facultyId', 'userId', 'pi'],
                    include: buildResearchCenterIncludeArray(),
                    order: [['createdAt', 'DESC']],
                }),
            () =>
                Project.findAll({
                    attributes: ['_id', 'status', 'centreId', 'centre', 'fundingSource', 'facultyId', 'userId', 'pi'],
                    order: [['createdAt', 'DESC']],
                }),
            []
        ),
        runWithResearchCenterFallback(
            () =>
                FundRequest.findAll({
                    attributes: [
                        '_id',
                        'projectId',
                        'projectTitle',
                        'faculty',
                        'facultyId',
                        'userId',
                        'requestedAmount',
                        'installmentNumber',
                        'status',
                        'currentStage',
                        'chequeStatus',
                        'department',
                        'centre',
                        'centreId',
                        'source',

                        'createdAt',
                        'updatedAt',
                    ],
                    include: [
                        buildCentreInclude(), 
                        buildProjectInclude(),
                        { model: Disbursement, as: 'Disbursement', required: false }
                    ].filter(Boolean),
                    order: [['createdAt', 'DESC']],
                }),
            () =>
                FundRequest.findAll({
                    attributes: [
                        '_id',
                        'projectId',
                        'projectTitle',
                        'faculty',
                        'facultyId',
                        'userId',
                        'requestedAmount',
                        'installmentNumber',
                        'status',
                        'currentStage',
                        'chequeStatus',
                        'department',
                        'centre',
                        'centreId',
                        'source',

                        'createdAt',
                        'updatedAt',
                    ],
                    include: [
                        buildProjectInclude({ includeResearchCenter: false }),
                        { model: Disbursement, as: 'Disbursement', required: false }
                    ].filter(Boolean),
                    order: [['createdAt', 'DESC']],
                }),
            []
        ),
        runWithResearchCenterFallback(
            () =>
                Disbursement.findAll({
                    attributes: ['_id', 'fundRequestId', 'projectId', 'amount', 'disbursedAt', 'bankReference', 'remarks', 'createdAt', 'updatedAt'],
                    include: [
                        {
                            model: FundRequest,
                            as: 'FundRequest',
                            attributes: [
                                '_id',
                                'projectId',
                                'projectTitle',
                                'faculty',
                                'facultyId',
                                'userId',
                                'requestedAmount',
                                'status',
                                'currentStage',
                                'department',
                                'centre',
                                'centreId',
                                'source',
                            ],
                            include: [buildCentreInclude(), buildProjectInclude()].filter(Boolean),
                            required: false,
                        },
                        buildProjectInclude(),
                    ].filter(Boolean),
                    order: [['disbursedAt', 'DESC']],
                }),
            () =>
                Disbursement.findAll({
                    attributes: ['_id', 'fundRequestId', 'projectId', 'amount', 'disbursedAt', 'bankReference', 'remarks', 'createdAt', 'updatedAt'],
                    include: [
                        {
                            model: FundRequest,
                            as: 'FundRequest',
                            attributes: [
                                '_id',
                                'projectId',
                                'projectTitle',
                                'faculty',
                                'facultyId',
                                'userId',
                                'requestedAmount',
                                'status',
                                'currentStage',
                                'department',
                                'centre',
                                'centreId',
                                'source',
                            ],
                            include: [buildProjectInclude({ includeResearchCenter: false })],
                            required: false,
                        },
                        buildProjectInclude({ includeResearchCenter: false }),
                    ].filter(Boolean),
                    order: [['disbursedAt', 'DESC']],
                }),
            []
        ),
        User.count({ where: { role: 'FACULTY' } }),
    ]);

    return {
        centres,
        projects: projects.map((project) => normalizeProject(project)),
        fundRequests: fundRequests.map((request) => normalizeFundRequest(request)),
        disbursements: disbursements.map((entry) => normalizeDisbursement(entry)),
        totalFaculty,
    };
};

const buildCentreBreakdown = ({ centres, projects, fundRequests, disbursements }) => {
    const context = buildCentreRegistry(centres);

    // 1. Map Projects to Centres to assist Disbursement mapping
    const projectToCentreId = new Map();
    projects.forEach((project) => {
        const identity = resolveCentreIdentity(project, context);
        if (!identity) {
            logger.warn('[DATA ISSUE] Project missing researchCentre:', project._id || project.id);
            return; // 🔴 DO NOT GROUP INTO "Others"
        }
        const centre = ensureCentreEntry(identity, context);
        centre.totalProjects += 1;
        projectToCentreId.set(project.id || project._id, centre.key);

        if (ACTIVE_PROJECT_STATUSES.includes(project.status)) {
            centre.activeProjects += 1;
        }
    });

    // 2. Aggregate Budget from FundRequests (SSOT for centre-wise allocation)
    fundRequests.forEach((request) => {
        if (!ALLOCATED_STATUSES.includes(request.status)) {
            return;
        }

        const centre = ensureCentreEntry(resolveCentreIdentity(request, context), context);
        centre.totalBudget = Number(centre.totalBudget || 0) + toNumber(request.requestedAmount);
    });

    // 3. Aggregate Used from Disbursements (JOIN logic via Project centreId)
    disbursements.forEach((entry) => {
        const identity = resolveCentreIdentity(entry, context) || { key: 'unassigned', name: 'UNASSIGNED' };
        const centre = ensureCentreEntry(identity, context);
        centre.disbursed = Number(centre.disbursed || 0) + toNumber(entry.amount);
    });

    return [...context.registry.values()]
        .map((centre) => ({
            ...centre,
            _id: centre.id || null,
            totalBudget: Number(centre.totalBudget || 0),
            disbursed: Number(centre.disbursed || 0),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
};

const getAdminDashboardData = async (financialYear = null) => {
    const fy = financialYear || getCurrentFY();
    const dateRange = getFYDateRange(fy);
    
    const sharedRaw = await getSharedPipelineData();
    const shared = {
        ...sharedRaw,
        fundRequests: sharedRaw.fundRequests || [],
        disbursements: sharedRaw.disbursements || [],
        projects: sharedRaw.projects || [],
    };

    const globalUsed = shared.disbursements.reduce((sum, d) => sum + toNumber(d.amount), 0);
    
    const [totalAllocated, fundSources, monthlyData] = await Promise.all([
        FundSource.sum('totalAllocated') || 0,
        getFundSourceOverview(shared),
        getMonthlyAnalytics(dateRange)
    ]);

    const globalAllocated = Number(totalAllocated || 0);
    const globalRemaining = Math.max(0, globalAllocated - globalUsed);
    const projectCount = shared.projects.length;

    const centresBreakdown = buildCentreBreakdown(shared).map(({ key, ...centre }) => ({
        ...centre,
        totalBudget: Number(centre.totalBudget || 0),
        disbursed: Number(centre.disbursed || 0)
    }));

    // FINAL VALIDATION: global.used === SUM(centres.used)
    const sumCentresUsed = centresBreakdown.reduce((sum, c) => sum + c.disbursed, 0);
    if (Math.abs(globalUsed - sumCentresUsed) > 0.01) {
        logger.error(`[MATHEMATICAL INCONSISTENCY] Global: ${globalUsed}, Centres Sum: ${sumCentresUsed}`);
    }

    return {
        success: true,
        data: {
            totalAllocated: Number(globalAllocated),
            used: Number(globalUsed),
            remaining: Number(globalRemaining),
            totalBudget: Number(globalAllocated),
            projectCount: Number(projectCount),
            totalProjects: Number(projectCount),
            activeProjects: Number(shared.projects.filter(p => ACTIVE_PROJECT_STATUSES.includes(p.status)).length),
            pendingApprovals: Number(shared.fundRequests.filter((request) => request.status === 'PENDING').length),
            totalFaculty: Number(shared.totalFaculty || 0),
            totalDisbursed: Number(globalUsed),
            centres: centresBreakdown,
            monthlyData: (monthlyData || []).map(m => ({ ...m, amount: Number(m.amount || 0) })),
            pfmsStats: {
                allotted: Number(fundSources.pfmsFunds.totalAllocated || 0),
                consumed: Number(fundSources.pfmsFunds.totalUsed || 0),
                balance: Number(fundSources.pfmsFunds.remainingBalance || 0),
            },
            institutionalStats: {
                allotted: Number(fundSources.institutionalFunds.totalAllocated || 0),
                consumed: Number(fundSources.institutionalFunds.totalUsed || 0),
                balance: Number(fundSources.institutionalFunds.remainingBalance || 0),
            },
            othersStats: {
                allotted: Number(fundSources.othersFunds.totalAllocated || 0),
                consumed: Number(fundSources.othersFunds.totalUsed || 0),
                balance: Number(fundSources.othersFunds.remainingBalance || 0),
            },
            fundSources: buildFundSourceCards(fundSources),
            recentRequests: shared.fundRequests
                .slice()
                .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
                .slice(0, 10),
            forecast: await getForecastingAnalytics(shared, globalAllocated)
        }
    };
};


const matchesFaculty = (record, facultyId, facultyName) => {
    const recordFacultyId = record?.facultyId || record?.userId || record?.FundRequest?.facultyId || record?.FundRequest?.userId || record?.Project?.facultyId || record?.Project?.userId;
    const recordFacultyName = record?.faculty || record?.Project?.pi || record?.FundRequest?.faculty;

    return (
        recordFacultyId === facultyId ||
        (facultyName && recordFacultyName === facultyName)
    );
};

const getFacultyDashboardData = async (facultyId, facultyName) => {
    const shared = await getSharedPipelineData();

    const projects = shared.projects.filter((project) =>
        project.facultyId === facultyId ||
        project.userId === facultyId ||
        (facultyName && project.pi === facultyName)
    );
    const fundRequests = shared.fundRequests.filter((request) => matchesFaculty(request, facultyId, facultyName));
    const disbursements = shared.disbursements.filter((entry) => matchesFaculty(entry, facultyId, facultyName));

    const facultyApprovedFunds = fundRequests
        .filter((request) => ALLOCATED_STATUSES.includes(request.status))
        .reduce((sum, request) => sum + toNumber(request.requestedAmount), 0);
    const facultyDisbursed = disbursements.reduce((sum, entry) => sum + toNumber(entry.amount), 0);

    const facultyTotalAllocated = projects.reduce(
        (sum, p) => sum + Number(p.sanctionedBudget || 0),
        0
    );

    return {
        totalProjects: projects.length,
        activeProjects: projects.filter((project) => ACTIVE_PROJECT_STATUSES.includes(project.status)).length,
        totalAllocated: facultyTotalAllocated,
        totalUsed: facultyDisbursed,
        totalDisbursed: facultyDisbursed,
        remaining: Math.max(0, facultyTotalAllocated - facultyDisbursed),
        balance: Math.max(0, facultyTotalAllocated - facultyDisbursed),
        facultyApprovedFunds,
        facultyDisbursed,
    };
};

const getFundSourceOverview = async (existingShared = null) => {
    const shared = existingShared || await getSharedPipelineData();
    const fundSourceRows = await FundSource.findAll({
        attributes: ['sourceType', 'totalAllocated'],
    });
    const projectCounts = shared.projects.reduce((acc, project) => {
        const source = normalizeFundSource(project.fundingSource || 'OTHERS');
        acc[source] = (acc[source] || 0) + 1;
        return acc;
    }, {});

    const sourceAllocations = fundSourceRows.reduce((acc, row) => {
        const sourceType = normalizeFundSourceType(row.sourceType);
        if (!sourceType) {
            return acc;
        }

        acc[sourceType] = toNumber(row.totalAllocated);
        return acc;
    }, {});

    const disbursedBySource = buildDisbursedBySource(shared.disbursements);
    const pickAllocated = (sourceType) => toNumber(sourceAllocations[sourceType]);

    return {
        institutionalFunds: {
            totalAllocated: pickAllocated('institutionalFunds'),
            totalUsed: toNumber(disbursedBySource.INSTITUTIONAL),
            remainingBalance: Math.max(
                0,
                pickAllocated('institutionalFunds') - toNumber(disbursedBySource.INSTITUTIONAL)
            ),
            projectCount: projectCounts.INSTITUTIONAL || 0,
        },
        pfmsFunds: {
            totalAllocated: pickAllocated('pfmsFunds'),
            totalUsed: toNumber(disbursedBySource.PFMS),
            remainingBalance: Math.max(0, pickAllocated('pfmsFunds') - toNumber(disbursedBySource.PFMS)),
            projectCount: projectCounts.PFMS || 0,
        },
        othersFunds: {
            totalAllocated: pickAllocated('othersFunds'),
            totalUsed: toNumber(disbursedBySource.OTHERS),
            remainingBalance: Math.max(
                0,
                pickAllocated('othersFunds') - toNumber(disbursedBySource.OTHERS)
            ),
            projectCount: projectCounts.OTHERS || 0,
        },
    };
};

const getDepartmentFundingRows = async (centreIdentifier) => {
    const { centres, shared } = await (async () => {
        const adminData = await getAdminDashboardData();
        return {
            centres: adminData?.data?.centres || [],
            shared: await getSharedPipelineData(),
        };
    })();

    const requestedKey = normalizeName(centreIdentifier);
    const selectedCentre = centres.find((centre) =>
        normalizeName(centre.id || centre.name) === requestedKey ||
        normalizeName(centre.name) === requestedKey
    );

    if (!selectedCentre) {
        return [];
    }

    const matchingRequests = shared.fundRequests.filter((request) =>
        normalizeName(request.centreName) === normalizeName(selectedCentre.name)
    );
    const matchingDisbursements = shared.disbursements.filter((entry) =>
        normalizeName(entry.Project?.centreName || entry.FundRequest?.centreName) === normalizeName(selectedCentre.name)
    );

    const buildRow = (label, sources) => {
        const stats = buildSourceStats(matchingRequests, matchingDisbursements, sources);
        return {
            id: `${normalizeName(selectedCentre.name)}:${Array.isArray(sources) ? sources.join('-') : sources}`,
            departmentName: selectedCentre.name,
            fundSource: label,
            totalAllocated: stats.allotted,
            amountReleased: stats.consumed,
            remainingBalance: stats.balance,
        };
    };

    return [
        buildRow('INSTITUTIONAL', 'INSTITUTIONAL'),
        buildRow('PFMS', 'PFMS'),
        buildRow('OTHERS', 'OTHERS'),
    ].filter((row) => row.totalAllocated > 0 || row.amountReleased > 0);
};

const getForecastingAnalytics = async (shared, totalAllocated) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentDisbursements = (shared.disbursements || []).filter(d => 
        new Date(d.disbursedAt || d.createdAt) >= thirtyDaysAgo
    );

    const totalSpend30d = recentDisbursements.reduce((sum, d) => sum + toNumber(d.amount), 0);
    const dataPoints = recentDisbursements.length;

    // actualDays: range between first and last disbursement in window, min 1, max 30
    let actualDays = 30;
    if (dataPoints > 1) {
        const dates = recentDisbursements.map(d => new Date(d.disbursedAt || d.createdAt).getTime());
        const span = (Math.max(...dates) - Math.min(...dates)) / (24 * 60 * 60 * 1000);
        actualDays = Math.max(1, Math.min(30, Math.ceil(span)));
    }

    const avgDailySpend = totalSpend30d / Math.max(1, actualDays);
    const projectedUsage30Days = avgDailySpend * 30;
    
    const used = (shared.disbursements || []).reduce((sum, d) => sum + toNumber(d.amount), 0);
    const remaining = Math.max(0, totalAllocated - used);
    
    const risk = projectedUsage30Days > remaining ? 'HIGH' : 'SAFE';
    const confidence = dataPoints > 15 ? 'HIGH' : (dataPoints > 5 ? 'MEDIUM' : 'LOW');

    return {
        avgDailySpend: toNumber(avgDailySpend),
        projectedUsage30Days: toNumber(projectedUsage30Days),
        risk,
        confidence,
        dataPoints,
        totalSpend30d: toNumber(totalSpend30d)
    };
};

module.exports = {
    ALLOCATED_STATUSES,
    ACTIVE_PROJECT_STATUSES,
    buildProjectInclude,
    buildCentreInclude,
    normalizeProject,
    normalizeFundRequest,
    normalizeDisbursement,
    getAdminDashboardData,
    getFacultyDashboardData,
    getFundSourceOverview,
    getDepartmentFundingRows,
    getSharedPipelineData,
    getFundingTotals,
    getForecastingAnalytics,
    getMonthlyAnalytics,
    getYoYGrowth,
    toNumber,
};
