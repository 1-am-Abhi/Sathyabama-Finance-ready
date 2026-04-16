const { Project, FundRequest } = require('../models');
const { serverError } = require('../utils/controllerError');
const { fn, col, literal } = require('sequelize');
const logger = require('../utils/logger');

const dashboardCache = new Map();

const getGlobalMetrics = async (req, res) => {
    try {
        const cacheKey = 'global_metrics';

        // ✅ Cache check
        if (dashboardCache.has(cacheKey)) {
            return res.status(200).json({
                success: true,
                data: dashboardCache.get(cacheKey),
                cached: true
            });
        }

        // ✅ Parallel queries (better than single aggregation)
        const [projectStats, pendingRequests] = await Promise.all([
            Project.findAll({
                attributes: [
                    [fn('SUM', col('sanctionedBudget')), 'totalSanctioned'],
                    [fn('SUM', col('releasedBudget')), 'totalDisbursed'],
                    [
                        fn(
                            'SUM',
                            literal(`CASE WHEN status IS NOT NULL AND status NOT IN ('COMPLETED','CLOSED') THEN 1 ELSE 0 END`)
                        ),
                        'activeProjects'
                    ]
                ],
                raw: true
            }),
            FundRequest.count({ where: { status: 'PENDING' } })
        ]);

        const metricsRow = projectStats[0] || {};

        const totalSanctioned = Number(metricsRow.totalSanctioned) || 0;
        const totalDisbursed = Number(metricsRow.totalDisbursed) || 0;
        const activeProjects = Number(metricsRow.activeProjects) || 0;
        const remainingFunds = Math.max(0, totalSanctioned - totalDisbursed);

        const data = {
            totalSanctioned,
            totalDisbursed,
            remainingFunds,
            activeProjects,
            pendingRequests
        };

        // ✅ Logging (important for observability)
        if (totalSanctioned === 0 && totalDisbursed === 0) {
            logger.warn('[Dashboard] Empty metrics returned');
        }

        // ✅ Cache (safe TTL)
        dashboardCache.set(cacheKey, data);

        setTimeout(() => {
            dashboardCache.delete(cacheKey);
        }, 5000);

        return res.status(200).json({
            success: true,
            data
        });

    } catch (error) {
        logger.error('[Dashboard Error]', error);
        return serverError(res, error);
    }
};

module.exports = { getGlobalMetrics };