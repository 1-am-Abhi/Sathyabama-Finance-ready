const { Op } = require('sequelize');
const { Project, FundRequest, Disbursement, Revenue, Sequelize } = require('../models');
const { getFYRange } = require('../utils/fyUtils');
const { safeNumber, safeArray } = require('../utils/safeUtils');
const logger = require('../utils/logger');

const dashboardCache = new Map();
const CACHE_TTL_MS = 20000;

exports.getDashboardMetrics = async ({ fy, organizationId }) => {
  const cacheKey = JSON.stringify({ fy: fy || null, organizationId: organizationId || null });
  const cached = dashboardCache.get(cacheKey);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const range = getFYRange(fy);

    const whereDate = range
      ? { createdAt: { [Op.between]: [range.startDate, range.endDate] } }
      : {};

    const orgId = organizationId || null;
    const orgFilter = orgId ? { organizationId: orgId } : {};

    // 🔹 Projects
    const totalProjects = safeNumber(await Project.count({ where: { ...orgFilter } }));

    // 🔹 Fund Requests (pipeline)
    const pendingApprovals = safeNumber(await FundRequest.count({
      where: { ...orgFilter, status: 'PENDING', ...whereDate }
    }));

    const approvedRequests = safeNumber(await FundRequest.count({
      where: { ...orgFilter, status: 'APPROVED', ...whereDate }
    }));

    const disbursementDate = range
      ? { disbursedAt: { [Op.between]: [range.startDate, range.endDate] } }
      : {};
    const disbursementWhere = { ...orgFilter, ...disbursementDate };

    // 🔹 Revenue
    let revenueSum = 0;
    if (Revenue) {
      revenueSum = safeNumber(await Revenue.sum('verifiedAmount', {
        where: { ...whereDate }
      }));
    }

    // 🔹 Research Centre breakdown (real)
    const rawProjects = await Project.findAll({
      attributes: ['researchCentre', 'centre'],
      where: { ...orgFilter }
    });
    const projects = safeArray(rawProjects);

    const centreMap = {};
    for (const p of projects) {
      const key = p.researchCentre || p.centre || 'General';
      centreMap[key] = (centreMap[key] || 0) + 1;
    }

    const centres = Object.entries(centreMap).map(([name, count]) => ({
      name,
      projectCount: count
    }));

    const [disbursementAggregate, rawMonthlyTrend] = await Promise.all([
      Disbursement.findOne({
        attributes: [[Sequelize.fn('COALESCE', Sequelize.fn('SUM', Sequelize.col('amount')), 0), 'totalDisbursed']],
        where: disbursementWhere,
        raw: true
      }),
      Disbursement.findAll({
        attributes: [
          [Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('disbursedAt')), 'month'],
          [Sequelize.fn('SUM', Sequelize.col('amount')), 'total']
        ],
        where: disbursementWhere,
        group: [Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('disbursedAt'))],
        order: [[Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('disbursedAt')), 'ASC']],
        raw: true
      })
    ]);

    const disbursedSum = safeNumber(disbursementAggregate?.totalDisbursed);
    const trend = safeArray(rawMonthlyTrend).map((row) => ({
      month: new Date(row.month).toISOString().slice(0, 7),
      total: safeNumber(row.total)
    }));

    // 🔹 Utilization %
    const totalSanctionedSum = safeNumber(await Project.sum('sanctionedBudget', {
      where: { ...orgFilter }
    }));
    const utilization = totalSanctionedSum > 0 ? (disbursedSum / totalSanctionedSum) * 100 : 0;

  // Institutional fund overview for the Admin Dashboard (Director/Institutional,
  // PFMS, Others). Previously absent from this response, so the admin fund cards
  // rendered empty.
  let fundSources = [];
  try {
    const { getFundSourceOverview } = require('./pipelineMetricsService');
    const ov = await getFundSourceOverview();
    const row = (name, sourceType, o) => ({
      name,
      sourceType,
      totalAllocated: safeNumber(o?.totalAllocated),
      totalUsed: safeNumber(o?.totalUsed),
      remainingBalance: safeNumber(o?.remainingBalance),
    });
    fundSources = [
      row('INSTITUTIONAL', 'institutionalFunds', ov.institutionalFunds),
      row('PFMS', 'pfmsFunds', ov.pfmsFunds),
      row('OTHERS', 'othersFunds', ov.othersFunds),
    ];
  } catch (e) {
    logger.warn('[dashboard] fund sources overview failed:', e.message);
  }
  const totalAllocated = fundSources.reduce((s, f) => s + safeNumber(f.totalAllocated), 0);

  const data = {
    totalProjects,
    pendingApprovals,
    approvedRequests,
    totalDisbursed: disbursedSum,
    totalRevenue: revenueSum,
    utilization: safeNumber(utilization.toFixed(2)),
    centres: safeArray(centres),
    trend: safeArray(trend),
    fundSources,
    totalAllocated,
    used: disbursedSum,
    remaining: Math.max(0, totalAllocated - disbursedSum)
  };
  dashboardCache.set(cacheKey, { createdAt: Date.now(), data });
  return data;
};

/**
 * Institutional Cache Invalidation.
 * Clears the dashboard metrics cache to force re-fetch after financial state changes.
 */
exports.clearDashboardCache = () => {
  logger.info('[DashboardService] Invalidating global metrics cache');
  dashboardCache.clear();
};
