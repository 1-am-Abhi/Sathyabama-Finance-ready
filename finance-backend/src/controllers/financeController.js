const asyncHandler = require('../utils/asyncHandler');
const Project = require('../models/Project');
const { FundRequest } = require('../models/FundRequest');
const Disbursement = require('../models/Disbursement');
const Revenue = require('../models/Revenue');
const User = require('../models/User');
const { Op, fn, col, literal } = require('sequelize');
const logger = require('../utils/logger');

/**
 * Aggregated Financial Metrics
 */
const getFinanceStats = asyncHandler(async (req, res) => {
    const [
        totalProjects,
        activeProjects,
        pendingApprovals,
        totalAllocated,
        totalDisbursed,
        totalFaculty,
        totalRevenue
    ] = await Promise.all([
        Project.count(),
        Project.count({ where: { status: { [Op.in]: ['ACTIVE', 'APPROVED'] } } }),
        FundRequest.count({ where: { status: 'PENDING' } }),
        Project.sum('sanctionedBudget') || 0,
        Disbursement.sum('amount') || 0,
        User.count({ where: { role: 'FACULTY' } }),
        Revenue.sum('verifiedAmount', { where: { status: 'VERIFIED' } }) || 0
    ]);

    if (totalProjects === 0) {
        logger.warn('[Finance] Dashboard requested but database is empty. Returning zeroed metrics.');
    }

    res.json({
        success: true,
        data: {
            totalProjects: totalProjects || 0,
            activeProjects: activeProjects || 0,
            pendingApprovals: pendingApprovals || 0,
            totalAllocated: totalAllocated || 0,
            totalDisbursed: totalDisbursed || 0,
            totalFaculty: totalFaculty || 0,
            totalRevenue: totalRevenue || 0,
            pfmsStats: {
                allotted: 2500000,
                consumed: (totalDisbursed || 0) * 0.4
            },
            institutionalStats: {
                allotted: 5000000,
                consumed: (totalDisbursed || 0) * 0.3
            },
            othersStats: {
                allotted: 1000000,
                consumed: (totalDisbursed || 0) * 0.1
            }
        }
    });
});

const getFundSourcesOverview = asyncHandler(async (req, res) => {
    const sources = await Project.findAll({
        attributes: [
            'fundingSource',
            [fn('COUNT', col('id')), 'count'],
            [fn('SUM', col('sanctionedBudget')), 'totalBudget']
        ],
        group: ['fundingSource'],
        raw: true
    });

    res.json({
        success: true,
        data: (sources || []).map(s => ({
            fundingSource: s.fundingSource,
            count: Number(s.count) || 0,
            totalBudget: Number(s.totalBudget) || 0
        }))
    });
});

const getDepartmentFinance = asyncHandler(async (req, res) => {
    const departments = await Project.findAll({
        attributes: [
            'department',
            [fn('COUNT', col('id')), 'count'],
            [fn('SUM', col('sanctionedBudget')), 'totalBudget']
        ],
        group: ['department'],
        raw: true
    });

    res.json({
        success: true,
        data: (departments || []).map(d => ({
            department: d.department,
            count: Number(d.count) || 0,
            totalBudget: Number(d.totalBudget) || 0
        }))
    });
});

const getDisbursalHistory = asyncHandler(async (req, res) => {
    const history = await Disbursement.findAll({
        attributes: [
            [fn('date_trunc', 'month', col('createdAt')), 'month'],
            [fn('SUM', col('amount')), 'total']
        ],
        group: [literal("date_trunc('month', \"createdAt\")")],
        order: [[literal("date_trunc('month', \"createdAt\")"), 'DESC']],
        limit: 12,
        raw: true
    });

    res.json({
        success: true,
        data: (history || []).map(h => ({
            month: h.month,
            total: Number(h.total) || 0
        }))
    });
});

const getReportsData = asyncHandler(async (req, res) => {
    const [
        projectCounts,
        fundingSummary,
        disbursalMeta
    ] = await Promise.all([
        Project.count({ group: ['status'] }),
        Project.findAll({
            attributes: [
                'fundingSource',
                [Project.sequelize.fn('SUM', Project.sequelize.col('sanctionedBudget')), 'total']
            ],
            group: ['fundingSource']
        }),
        Disbursement.sum('amount')
    ]);

    res.json({
        success: true,
        data: {
            projects: projectCounts || {},
            funding: fundingSummary || [],
            totalDisbursed: disbursalMeta || 0,
            generatedAt: new Date().toISOString()
        }
    });
});

module.exports = {
    getFinanceStats,
    getFundSourcesOverview,
    getDepartmentFinance,
    getDisbursalHistory,
    getReportsData
};