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
        console.error('[AnalyticsController] getForecastBase failed:', error.message);
        res.status(200).json({
            success: true,
            count: 0,
            data: []
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
        console.error('[AnalyticsController] getInsights failed:', error.message);
        res.status(200).json({
            success: true,
            data: {
                avgDailySpend: 0,
                insights: [],
                period: 'Last 30 Days'
            }
        });
    }
};
