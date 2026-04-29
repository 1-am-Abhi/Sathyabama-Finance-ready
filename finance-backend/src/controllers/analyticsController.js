const logger = require('../utils/logger');
const analyticsService = require('../services/analyticsService');

/**
 * GET /api/analytics/forecast-base
 * Returns historical disbursement time-series for forecasting.
 */
exports.getForecastBase = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 90;
        const data = await analyticsService.generateForecastDataset(days);
        res.json({
            success: true,
            count: data.length,
            data
        });
    } catch (error) {
        logger.error('[AnalyticsController] getForecastBase failed:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to generate forecast dataset',
            error: error.message
        });
    }
};

/**
 * GET /api/analytics/insights
 * Returns heuristic insights and trends.
 */
exports.getInsights = async (req, res) => {
    try {
        const insights = await analyticsService.computeHeuristicInsights();
        res.json({
            success: true,
            data: insights
        });
    } catch (error) {
        logger.error('[AnalyticsController] getInsights failed:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to compute insights',
            error: error.message
        });
    }
};

const { User } = require('../models');

exports.getFacultyStats = async (req, res) => {
    try {
        const faculties = await User.findAll({ where: { role: 'FACULTY' }, attributes: ['centre', 'createdAt', 'status'] });
        const totalFaculty = faculties.length;
        
        const centreMap = {};
        const monthMap = {};

        faculties.forEach(f => {
            const centre = f.centre || 'Unassigned';
            centreMap[centre] = (centreMap[centre] || 0) + 1;

            const date = new Date(f.createdAt);
            const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthMap[month] = (monthMap[month] || 0) + 1;
        });

        const byCentre = Object.keys(centreMap).map(centre => ({ centre, count: centreMap[centre] }));
        const growth = Object.keys(monthMap).sort().map(month => ({ month, count: monthMap[month] }));

        res.json({
            success: true,
            data: {
                totalFaculty,
                byCentre,
                growth
            }
        });
    } catch (error) {
        logger.error('getFacultyStats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
