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
        res.status(500).json({ success: false, message: error.message });
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
        res.status(500).json({ success: false, message: error.message });
    }
};
