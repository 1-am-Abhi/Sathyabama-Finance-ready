const { Project, FundRequest } = require('../models');
const { serverError } = require('../utils/controllerError');
const { fn, col, literal } = require('sequelize');

const dashboardCache = new Map();

exports.getGlobalMetrics = async (req, res) => {
    try {
        if (dashboardCache.has('global_metrics')) {
            return res.status(200).json({
                success: true,
                data: dashboardCache.get('global_metrics'),
                cached: true
            });
        }

        const result = await Project.findAll({
            attributes: [
                [fn('SUM', col('sanctionedBudget')), 'totalSanctioned'],
                [fn('SUM', col('releasedBudget')), 'totalDisbursed'],
                [
                    fn('SUM', literal(`CASE WHEN status NOT IN ('COMPLETED','CLOSED') THEN 1 ELSE 0 END`)),
                    'activeProjects'
                ]
            ],
            raw: true
        });

        const metricsRow = result[0] || { totalSanctioned: 0, totalDisbursed: 0, activeProjects: 0 };
        const totalSanctioned = Number(metricsRow.totalSanctioned || 0);
        const totalDisbursed = Number(metricsRow.totalDisbursed || 0);
        const remainingFunds = Math.max(0, totalSanctioned - totalDisbursed);
        const activeProjects = Number(metricsRow.activeProjects || 0);

        const data = {
            totalSanctioned,
            totalDisbursed,
            remainingFunds,
            activeProjects
        };

        dashboardCache.set('global_metrics', data);
        setTimeout(() => dashboardCache.delete('global_metrics'), 30000);

        return res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        return serverError(res, error);
    }
};
