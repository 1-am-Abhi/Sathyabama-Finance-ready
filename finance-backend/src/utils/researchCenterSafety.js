const models = require('../models');

const getEmptyAdminStatsData = () => ({
    totalAllocated: 0,
    used: 0,
    remaining: 0,
    totalBudget: 0,
    projectCount: 0,
    totalProjects: 0,
    activeProjects: 0,
    pendingApprovals: 0,
    totalFaculty: 0,
    totalDisbursed: 0,
    centres: [],
    monthlyData: [],
    pfmsStats: {
        allotted: 0,
        consumed: 0,
        balance: 0,
    },
    institutionalStats: {
        allotted: 0,
        consumed: 0,
        balance: 0,
    },
    othersStats: {
        allotted: 0,
        consumed: 0,
        balance: 0,
    },
    fundSources: [],
    recentRequests: [],
    forecast: {
        avgDailySpend: 0,
        projectedUsage30Days: 0,
        risk: 'SAFE',
        confidence: 'LOW',
        dataPoints: 0,
        totalSpend30d: 0,
    },
});

const toPlain = (record) => (record && typeof record.toJSON === 'function' ? record.toJSON() : record);

const getResearchCenterModel = () =>
    models.sequelize?.models?.ResearchCenter ||
    models.ResearchCenter ||
    models.Centre ||
    null;

const buildResearchCenterInclude = (options = {}) => {
    try {
        const ResearchCenter = getResearchCenterModel();
        if (!ResearchCenter) {
            return null;
        }

        const {
            attributes = ['_id', 'name'],
            as = 'researchCenter',
            required = false,
        } = options;

        return {
            model: ResearchCenter,
            as,
            attributes,
            required,
        };
    } catch (error) {
        console.warn('[ResearchCenter] Failed to build include:', error.message);
        return null;
    }
};

const buildResearchCenterIncludeArray = (options = {}) => {
    const include = buildResearchCenterInclude(options);
    return include ? [include] : [];
};

const getResearchCenterAssociation = (record) => {
    const raw = toPlain(record);
    return raw?.researchCenter || raw?.researchCentre || null;
};

const getResearchCenterName = (record, fallback = 'N/A') => {
    const raw = toPlain(record);
    return (
        raw?.researchCenter?.name ||
        raw?.researchCentre?.name ||
        raw?.researchCenterName ||
        raw?.centre ||
        fallback
    );
};

const getResearchCenterId = (record) => {
    const raw = toPlain(record);
    return (
        raw?.researchCenter?._id ||
        raw?.researchCenter?.id ||
        raw?.researchCentre?._id ||
        raw?.researchCentre?.id ||
        raw?.researchCenterId ||
        raw?.centreId ||
        null
    );
};

const normalizeResearchCenterResponse = (record, fallback = 'N/A') => {
    const raw = toPlain(record) || {};
    const researchCenterName = getResearchCenterName(raw, fallback);

    return {
        ...raw,
        researchCenter: researchCenterName,
        researchCenterName,
        researchCenterId: getResearchCenterId(raw),
    };
};

const normalizeResearchCenterResponseList = (records = [], fallback = 'N/A') =>
    (Array.isArray(records) ? records : []).map((record) =>
        normalizeResearchCenterResponse(record, fallback)
    );

const isResearchCenterFailure = (error) => {
    const message = [
        error?.name,
        error?.message,
        error?.parent?.message,
        error?.original?.message,
    ]
        .filter(Boolean)
        .join(' ');

    return /ResearchCenter|researchCenter|researchCentre|ResearchCenters|researchCenterId|centreId|SequelizeEagerLoadingError|is not associated|does not exist/i.test(message);
};

module.exports = {
    buildResearchCenterInclude,
    buildResearchCenterIncludeArray,
    getEmptyAdminStatsData,
    getResearchCenterAssociation,
    getResearchCenterId,
    getResearchCenterModel,
    getResearchCenterName,
    isResearchCenterFailure,
    normalizeResearchCenterResponse,
    normalizeResearchCenterResponseList,
    toPlain,
};
