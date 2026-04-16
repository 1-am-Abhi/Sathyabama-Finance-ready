const Project = require('../models/Project');
const { FundRequest } = require('../models/FundRequest');
const Disbursement = require('../models/Disbursement');
const Revenue = require('../models/Revenue');
const User = require('../models/User');
const { Op, fn, col, literal } = require('sequelize');
const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');


/**
 * Aggregated Financial Metrics
 */
exports.getFinanceStats = asyncHandler(async (req, res) => {
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
            totalProjects,
            activeProjects,
            pendingApprovals,
            totalAllocated,
            totalDisbursed,
            totalFaculty,
            totalRevenue,
            pfmsStats: {
                allotted: 2500000, // Static baseline for PFMS cluster
                consumed: totalDisbursed * 0.4 // Mocked distribution for dashboard
            },
            institutionalStats: {
                allotted: 5000000,
                consumed: totalDisbursed * 0.3
            },
            othersStats: {
                allotted: 1000000,
                consumed: totalDisbursed * 0.1
            }
        }
    });
});

/**
 * Fund Sources Overview
 */
exports.getFundSourcesOverview = asyncHandler(async (req, res) => {
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
        data: sources.map(s => ({
            fundingSource: s.fundingSource,
            count: Number(s.count),
            totalBudget: Number(s.totalBudget) || 0
        }))
    });
});

/**
 * Department-wise Finance
 */
exports.getDepartmentFinance = asyncHandler(async (req, res) => {
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
        data: departments.map(d => ({
            department: d.department,
            count: Number(d.count),
            totalBudget: Number(d.totalBudget) || 0
        }))
    });
});

/**
 * Disbursal History
 */
exports.getDisbursalHistory = asyncHandler(async (req, res) => {
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
        data: history.map(h => ({
            month: h.month,
            total: Number(h.total) || 0
        }))
    });
});

/**
 * Full Reports Data (Detailed Aggregation)
 */
exports.getReportsData = asyncHandler(async (req, res) => {
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
            projects: projectCounts,
            funding: fundingSummary,
            totalDisbursed: disbursalMeta || 0,
            generatedAt: new Date().toISOString()
        }
    });
});