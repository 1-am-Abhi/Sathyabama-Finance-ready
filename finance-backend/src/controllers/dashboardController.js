const safe = require('../utils/safeController');
const { getDashboardMetrics } = require('../services/dashboardService');

exports.getDashboard = safe(async (req) => {
  const fy = req.query.fy;
  const organizationId = req.user?.organizationId;

  const data = await getDashboardMetrics({ fy, organizationId });
  return data;
});
