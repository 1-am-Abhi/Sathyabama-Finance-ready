const { Op } = require('sequelize');
const models = require('../models');

const Centre = models.Centre;
const Project = models.Project;
const FundRequest = models.FundRequest;
const Disbursement = models.Disbursement;
const FundSource = models.FundSource;
const User = models.User;

const ALLOCATED_STATUSES = ['APPROVED', 'PENDING_DISBURSAL', 'DISBURSED'];
const ACTIVE_PROJECT_STATUSES = ['ACTIVE', 'APPROVED'];

const toNumber = (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeName = (value) => String(value || '').trim().toLowerCase();

const getRecordId = (record) => record?._id || record?.id || null;

const getFundingTotals = async () => {
    const [allocated, used] = await Promise.all([
        FundSource.sum('totalAllocated'),
        Disbursement.sum('amount'),
    ]);

    const totalAllocated = toNumber(allocated);
    const totalUsed = toNumber(used);

    return {
        totalAllocated,
        totalUsed,
        totalDisbursed: totalUsed,
        remaining: Math.max(0, totalAllocated - totalUsed),
    };
};

const buildCentreInclude = () => ({
    model: Centre,
    as: 'researchCentre',
    attributes: ['_id', 'name'],
    required: false,
});

const buildProjectInclude = () => ({
    model: Project,
    as: 'Project',
    attributes: ['_id', 'title', 'pi', 'department', 'centre', 'centreId', 'fundingSource'],
    include: [buildCentreInclude()],
    required: false,
});

const normalizeProject = (project) => {
    if (!project) {
        return null;
    }

    const raw = project.toJSON ? project.toJSON() : project;
    return {
        ...raw,
        id: getRecordId(raw),
        centreName: raw.researchCentre?.name || raw.centre || null,
    };
};

const normalizeFundRequest = (request) => {
    if (!request) {
        return null;
    }

    const raw = request.toJSON ? request.toJSON() : request;
    const project = normalizeProject(raw.Project);
    return {
        ...raw,
        id: getRecordId(raw),
        amount: toNumber(raw.requestedAmount ?? raw.amount),
        Project: project,
        projectTitle: project?.title || raw.projectTitle || null,
        faculty: project?.pi || raw.faculty || null,
        centreName:
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
        record.researchCentre,
        record.Project?.researchCentre,
        record.FundRequest?.researchCentre,
        record.Project?.Project?.researchCentre,
    ].filter(Boolean);

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
        record.centreId,
        record.Project?.centreId,
        record.FundRequest?.centreId,
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
        record.Project?.centre,
        record.Project?.centreName,
        record.FundRequest?.centre,
        record.FundRequest?.centreName,
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
    const sources = Array.isArray(sourceMatchers) ? sourceMatchers : [sourceMatchers];

    const allotted = fundRequests
        .filter((request) => sources.includes(request.source) && ALLOCATED_STATUSES.includes(request.status))
        .reduce((sum, request) => sum + toNumber(request.requestedAmount), 0);

    const consumed = disbursements
        .filter((entry) => sources.includes(entry.FundRequest?.source))
        .reduce((sum, entry) => sum + toNumber(entry.amount), 0);

    return {
        allotted,
        consumed,
        balance: Math.max(0, allotted - consumed),
    };
};

const getSharedPipelineData = async () => {
    const [centres, projects, fundRequests, disbursements, totalFaculty] = await Promise.all([
        Centre.findAll({ order: [['name', 'ASC']] }),
        Project.findAll({
            attributes: ['_id', 'status', 'centreId', 'centre', 'fundingSource', 'facultyId', 'userId', 'pi'],
            include: [buildCentreInclude()],
            order: [['createdAt', 'DESC']],
        }),
        FundRequest.findAll({
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
                'createdAt',
                'updatedAt',
            ],
            include: [buildCentreInclude(), buildProjectInclude()],
            order: [['createdAt', 'DESC']],
        }),
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
                    include: [buildCentreInclude(), buildProjectInclude()],
                    required: false,
                },
                buildProjectInclude(),
            ],
            order: [['disbursedAt', 'DESC']],
        }),
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

    projects.forEach((project) => {
        const centre = ensureCentreEntry(resolveCentreIdentity(project, context), context);
        centre.totalProjects += 1;

        if (ACTIVE_PROJECT_STATUSES.includes(project.status)) {
            centre.activeProjects += 1;
        }
    });

    fundRequests.forEach((request) => {
        if (!ALLOCATED_STATUSES.includes(request.status)) {
            return;
        }

        const centre = ensureCentreEntry(resolveCentreIdentity(request, context), context);
        centre.totalBudget += toNumber(request.requestedAmount);
    });

    disbursements.forEach((entry) => {
        const centre = ensureCentreEntry(resolveCentreIdentity(entry, context), context);
        centre.disbursed += toNumber(entry.amount);
    });

    return [...context.registry.values()]
        .map((centre) => ({
            ...centre,
            totalBudget: toNumber(centre.totalBudget),
            disbursed: toNumber(centre.disbursed),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
};

const getAdminDashboardData = async () => {
    const [shared, fundingTotals, fundSources] = await Promise.all([
        getSharedPipelineData(),
        getFundingTotals(),
        getFundSourceOverview(),
    ]);

    const totalProjects = shared.projects.length;
    const activeProjects = shared.projects.filter((project) => ACTIVE_PROJECT_STATUSES.includes(project.status)).length;
    const pendingApprovals = shared.projects.filter((project) => project.status === 'PENDING').length;
    const approvedFunds = shared.fundRequests
        .filter((request) => ALLOCATED_STATUSES.includes(request.status))
        .reduce((sum, request) => sum + toNumber(request.requestedAmount), 0);

    return {
        stats: {
            totalProjects,
            activeProjects,
            pendingApprovals,
            totalAllocated: fundingTotals.totalAllocated,
            totalUsed: fundingTotals.totalUsed,
            totalDisbursed: fundingTotals.totalDisbursed,
            remaining: fundingTotals.remaining,
            approvedFunds,
            totalFaculty: shared.totalFaculty,
            pfmsStats: {
                allotted: fundSources.pfmsFunds.totalAllocated,
                consumed: fundSources.pfmsFunds.totalUsed,
                balance: fundSources.pfmsFunds.remainingBalance,
            },
            institutionalStats: {
                allotted: fundSources.collegeFunds.totalAllocated,
                consumed: fundSources.collegeFunds.totalUsed,
                balance: fundSources.collegeFunds.remainingBalance,
            },
            directorStats: {
                allotted: fundSources.directorFunds.totalAllocated,
                consumed: fundSources.directorFunds.totalUsed,
                balance: fundSources.directorFunds.remainingBalance,
            },
            othersStats: buildSourceStats(shared.fundRequests, shared.disbursements, 'OTHERS'),
        },
        centres: buildCentreBreakdown(shared).map(({ key, ...centre }) => centre),
        shared,
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
    const [shared, fundingTotals] = await Promise.all([
        getSharedPipelineData(),
        getFundingTotals(),
    ]);

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

    return {
        totalProjects: projects.length,
        activeProjects: projects.filter((project) => ACTIVE_PROJECT_STATUSES.includes(project.status)).length,
        totalAllocated: fundingTotals.totalAllocated,
        totalUsed: fundingTotals.totalUsed,
        totalDisbursed: fundingTotals.totalDisbursed,
        remaining: fundingTotals.remaining,
        balance: fundingTotals.remaining,
        facultyApprovedFunds,
        facultyDisbursed,
    };
};

const getFundSourceOverview = async () => {
    const shared = await getSharedPipelineData();
    const fundSourceRows = await FundSource.findAll({
        attributes: ['sourceType', 'totalAllocated'],
    });
    const projectCounts = shared.projects.reduce((acc, project) => {
        const source = project.fundingSource || 'OTHERS';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
    }, {});

    const sourceAllocations = fundSourceRows.reduce((acc, row) => {
        acc[row.sourceType] = toNumber(row.totalAllocated);
        return acc;
    }, {});

    const sourceStats = {
        institutional: buildSourceStats(shared.fundRequests, shared.disbursements, 'INSTITUTIONAL'),
        pfms: buildSourceStats(shared.fundRequests, shared.disbursements, 'PFMS'),
        other: buildSourceStats(shared.fundRequests, shared.disbursements, ['DIRECTOR', 'DIRECTOR_INNOVATION', 'OTHERS']),
    };

    return {
        collegeFunds: {
            totalAllocated: sourceAllocations.collegeFunds || sourceStats.institutional.allotted,
            totalUsed: sourceStats.institutional.consumed,
            remainingBalance: Math.max(0, (sourceAllocations.collegeFunds || sourceStats.institutional.allotted) - sourceStats.institutional.consumed),
            projectCount: projectCounts.INSTITUTIONAL || 0,
        },
        pfmsFunds: {
            totalAllocated: sourceAllocations.pfmsFunds || sourceStats.pfms.allotted,
            totalUsed: sourceStats.pfms.consumed,
            remainingBalance: Math.max(0, (sourceAllocations.pfmsFunds || sourceStats.pfms.allotted) - sourceStats.pfms.consumed),
            projectCount: projectCounts.PFMS || 0,
        },
        directorFunds: {
            totalAllocated: sourceAllocations.directorFunds || sourceStats.other.allotted,
            totalUsed: sourceStats.other.consumed,
            remainingBalance: Math.max(0, (sourceAllocations.directorFunds || sourceStats.other.allotted) - sourceStats.other.consumed),
            projectCount: (projectCounts.DIRECTOR || 0) + (projectCounts.DIRECTOR_INNOVATION || 0) + (projectCounts.OTHERS || 0),
        },
    };
};

const getDepartmentFundingRows = async (centreIdentifier) => {
    const { centres, shared } = await (async () => {
        const adminData = await getAdminDashboardData();
        return { centres: adminData.centres, shared: adminData.shared };
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
        buildRow('COLLEGE', ['INSTITUTIONAL', 'DIRECTOR', 'DIRECTOR_INNOVATION', 'OTHERS']),
        buildRow('PFMS', 'PFMS'),
    ].filter((row) => row.totalAllocated > 0 || row.amountReleased > 0);
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
};
