const { Op } = require('sequelize');
const { Project, FundRequest, Disbursement, Revenue, User } = require('../models');
const { getFYRange } = require('../utils/fyUtils');
const { safeNumber, safeArray } = require('../utils/safeUtils');

exports.getDashboardMetrics = async ({ fy, organizationId }) => {
  try {
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

    // 🔹 Disbursements
    const disbursedSum = safeNumber(await Disbursement.sum('amount', {
      where: { ...orgFilter, ...whereDate }
    }));

    // 🔹 Revenue
    let revenueSum = 0;
    if (Revenue) {
      revenueSum = safeNumber(await Revenue.sum('amount', {
        where: { ...orgFilter, ...whereDate }
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

    // 🔹 Monthly trend (for charts)
    const rawDisbursements = await Disbursement.findAll({
      attributes: ['amount', 'createdAt'],
      where: { ...orgFilter, ...whereDate }
    });
    const disbursements = safeArray(rawDisbursements);

    const monthly = {};
    disbursements.forEach(d => {
      const m = new Date(d.createdAt).toISOString().slice(0, 7); // YYYY-MM
      monthly[m] = (monthly[m] || 0) + safeNumber(d.amount);
    });

    const trend = Object.entries(monthly).map(([month, total]) => ({
      month,
      total
    }));

    // 🔹 Utilization %
    const totalSanctionedSum = safeNumber(await Project.sum('sanctionedBudget', {
      where: { ...orgFilter }
    }));
    const utilization = totalSanctionedSum > 0 ? (disbursedSum / totalSanctionedSum) * 100 : 0;

    return {
      totalProjects,
      pendingApprovals,
      approvedRequests,
      totalDisbursed: disbursedSum,
      totalRevenue: revenueSum,
      utilization: safeNumber(utilization.toFixed(2)),
      centres: safeArray(centres),
      trend: safeArray(trend)
    };
  } catch (err) {
    console.error("[DashboardService Error]", err);
    return {
      totalProjects: 0,
      pendingApprovals: 0,
      approvedRequests: 0,
      totalDisbursed: 0,
      totalRevenue: 0,
      utilization: 0,
      centres: [],
      trend: []
    };
  }
};
