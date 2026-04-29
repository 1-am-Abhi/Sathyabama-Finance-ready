const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');
const analyticsService = require('../services/analyticsService');
const { getDashboardMetrics } = require('../services/dashboardService');
const { User } = require('../models');
const { safeNumber, safeArray } = require('../utils/safeUtils');

/**
 * GET /api/analytics/forecast-base
 * Returns historical disbursement time-series for forecasting.
 */
exports.getForecastBase = asyncHandler(async (req, res) => {
    const days = parseInt(req.query.days) || 90;
    const data = safeArray(await analyticsService.generateForecastDataset(days));
    
    return res.json({
        success: true,
        count: data.length,
        data: safeArray(data)
    });
});

/**
 * GET /api/analytics/insights
 * Returns heuristic insights and trends.
 */
exports.getInsights = asyncHandler(async (req, res) => {
    const fy = req.query.fy || null;
    const organizationId = req.user?.organizationId || null;
    const metrics = await getDashboardMetrics({ fy, organizationId });
    
    return res.json({
        success: true,
        data: metrics || {
            totalProjects: 0,
            pendingApprovals: 0,
            approvedRequests: 0,
            totalDisbursed: 0,
            totalRevenue: 0,
            utilization: 0,
            centres: [],
            trend: []
        }
    });
});

/**
 * GET /api/analytics/faculty-stats
 * Returns breakdown of faculty by centre and growth trends.
 */
exports.getFacultyStats = asyncHandler(async (req, res) => {
    const faculties = safeArray(await User.findAll({ 
        where: { role: 'FACULTY' }, 
        attributes: ['centre', 'createdAt', 'status'],
        raw: true
    }));

    const totalFaculty = faculties.length;
    const centreMap = {};
    const monthMap = {};

    faculties.forEach(f => {
        const centre = f?.centre || 'Unassigned';
        centreMap[centre] = (centreMap[centre] || 0) + 1;

        const date = new Date(f?.createdAt || Date.now());
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthMap[month] = (monthMap[month] || 0) + 1;
    });

    const byCentre = Object.keys(centreMap).map(centre => ({ centre, count: centreMap[centre] }));
    const growth = Object.keys(monthMap).sort().map(month => ({ month, count: monthMap[month] }));

    return res.json({
        success: true,
        data: {
            totalFaculty: safeNumber(totalFaculty),
            byCentre: safeArray(byCentre),
            growth: safeArray(growth)
        }
    });
});
