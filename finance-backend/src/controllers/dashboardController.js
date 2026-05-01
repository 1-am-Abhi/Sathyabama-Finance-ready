const asyncHandler = require('../utils/asyncHandler');
const { getDashboardMetrics } = require('../services/dashboardService');

/**
 * GET /api/dashboard
 * Returns the main dashboard metrics with organization scoping.
 */
exports.getDashboard = asyncHandler(async (req, res) => {
  const fy = req.query.fy || null;
  const orgId = req.user.organizationId;

  const data = await getDashboardMetrics({ fy, organizationId: orgId });
  
  return res.json({
    success: true,
    data
  });
});
