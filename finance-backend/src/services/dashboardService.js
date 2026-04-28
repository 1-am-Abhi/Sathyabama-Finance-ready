const { Op } = require('sequelize');
const { Project, FundRequest, Disbursement, Revenue, User } = require('../models');

const getFYRange = (fy) => {
  // fy like "2026-2027"
  const [y1, y2] = (fy || '').split('-').map(Number);
  if (!y1 || !y2) return null;
  return {
    start: new Date(`${y1}-04-01T00:00:00.000Z`),
    end: new Date(`${y2}-03-31T23:59:59.999Z`)
  };
};

exports.getDashboardMetrics = async ({ fy, organizationId }) => {
  const range = getFYRange(fy);

  const whereDate = range
    ? { createdAt: { [Op.between]: [range.start, range.end] } }
    : {};

  const orgFilter = organizationId ? { organizationId } : {};

  // 🔹 Projects
  const totalProjects = await Project.count({ where: { ...orgFilter } });

  // 🔹 Fund Requests (pipeline)
  const pendingApprovals = await FundRequest.count({
    where: { ...orgFilter, status: 'PENDING', ...whereDate }
  });

  const approvedRequests = await FundRequest.count({
    where: { ...orgFilter, status: 'APPROVED', ...whereDate }
  });

  // 🔹 Disbursements
  const disbursedSum = await Disbursement.sum('amount', {
    where: { ...orgFilter, ...whereDate }
  });

  // 🔹 Revenue (if you use it)
  let revenueSum = 0;
  if (Revenue) {
    revenueSum = await Revenue.sum('amount', {
      where: { ...orgFilter, ...whereDate }
    });
  }

  // 🔹 Research Centre breakdown (real)
  const projects = await Project.findAll({
    attributes: ['researchCentre', 'centre'],
    where: { ...orgFilter }
  });

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
  const disbursements = await Disbursement.findAll({
    attributes: ['amount', 'createdAt'],
    where: { ...orgFilter, ...whereDate }
  });

  const monthly = {};
  disbursements.forEach(d => {
    const m = new Date(d.createdAt).toISOString().slice(0, 7); // YYYY-MM
    monthly[m] = (monthly[m] || 0) + Number(d.amount || 0);
  });

  const trend = Object.entries(monthly).map(([month, total]) => ({
    month,
    total
  }));

  return {
    totalProjects,
    pendingApprovals,
    approvedRequests,
    totalDisbursed: disbursedSum || 0,
    totalRevenue: revenueSum || 0,
    centres,
    trend
  };
};
