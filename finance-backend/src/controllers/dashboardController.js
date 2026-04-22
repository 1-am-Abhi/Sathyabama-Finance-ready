const asyncHandler = require('../utils/asyncHandler');
const { Project, FundRequest } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { getFundingTotals } = require('../services/pipelineMetricsService');

const dashboardCache = new Map();

const getGlobalMetrics = asyncHandler(async (req, res) => {
    const cacheKey = 'global_metrics';

    // ✅ Cache check
    if (dashboardCache.has(cacheKey)) {
        return res.status(200).json({
            success: true,
            data: dashboardCache.get(cacheKey) || {},
            cached: true
        });
    }

    const [activeProjects, pendingRequests, fundingTotals] = await Promise.all([
        Project.count({
            where: {
                status: {
                    [Op.notIn]: ['COMPLETED', 'CLOSED']
                }
            }
        }),
        FundRequest.count({ where: { status: 'PENDING' } }) || 0,
        getFundingTotals(),
    ]);
    const totalSanctioned = Number(fundingTotals?.totalAllocated || 0);
    const totalDisbursed = Number(fundingTotals?.used || 0);
    const remainingFunds = Math.max(0, totalSanctioned - totalDisbursed);

    const data = {
        totalSanctioned,
        totalDisbursed,
        remainingFunds,
        activeProjects,
        pendingRequests: pendingRequests || 0
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
        data: data || {}
    });
});

module.exports = { getGlobalMetrics };
