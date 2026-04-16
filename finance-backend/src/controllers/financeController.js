const Project = require('../models/Project');
const { FundRequest } = require('../models/FundRequest');
const Disbursement = require('../models/Disbursement');
const Revenue = require('../models/Revenue');
const { Op, fn, col, literal } = require('sequelize');
const logger = require('../utils/logger');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Aggregated Financial Metrics
 */
exports.getFinanceStats = asyncHandler(async (req, res) => {
    const [
        totalProjects,
        totalBudgetRaw,
        totalDisbursedRaw,
        pendingRequests,
        totalRevenueRaw
    ] = await Promise.all([
        Project.count(),
        Project.sum('sanctionedBudget'),
        Disbursement.sum('amount'),
        FundRequest.count({ where: { status: 'PENDING' } }),
        Revenue.sum('verifiedAmount', { where: { status: 'VERIFIED' } })
    ]);

    const totalBudget = Number(totalBudgetRaw) || 0;
    const totalDisbursed = Number(totalDisbursedRaw) || 0;
    const totalRevenue = Number(totalRevenueRaw) || 0;

    if (totalProjects === 0) {
        logger.warn('[Finance] Empty DB → returning zero metrics');
    }

    res.json({
        success: true,
        data: {
            totalProjects,
            totalBudget,
            totalDisbursed,
            pendingRequests,
            totalRevenue,
            utilizationRate: totalBudget > 0
                ? Number(((totalDisbursed / totalBudget) * 100).toFixed(2))
                : 0
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