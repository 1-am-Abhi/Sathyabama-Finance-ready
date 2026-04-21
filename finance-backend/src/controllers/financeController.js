const asyncHandler = require('../utils/asyncHandler');
const {
    Project, FundRequest, Disbursement, Revenue, User,
    FundSource, InternshipFee, PFMSTransaction, sequelize
} = require('../models');
const { Op, fn, col, literal } = require('sequelize');
const logger = require('../utils/logger');
const { mapToFundSourceKey, ensureCanonicalFundSources } = require('../services/fundSourceCatalogService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_TYPE_TO_NAME = {
    'institutionalFunds': 'INSTITUTIONAL',
    'pfmsFunds': 'PFMS',
    'othersFunds': 'OTHERS',
};

const NAME_TO_SOURCE_TYPE = {
    'INSTITUTIONAL': 'institutionalFunds',
    'PFMS': 'pfmsFunds',
    'OTHERS': 'othersFunds',
};

/**
 * Safely get disbursement totals grouped by FundRequest.source.
 * Returns { INSTITUTIONAL: number, PFMS: number, OTHERS: number }
 */
const getDisbursedBySource = async () => {
    const result = { INSTITUTIONAL: 0, PFMS: 0, OTHERS: 0 };
    try {
        const [rows] = await sequelize.query(`
            SELECT fr."source", COALESCE(SUM(d."amount"), 0) as "totalUsed"
            FROM "Disbursements" d
            INNER JOIN "FundRequests" fr ON d."fundRequestId" = fr."_id"
            WHERE fr."source" IS NOT NULL
            GROUP BY fr."source"
        `);
        (rows || []).forEach(r => {
            if (result.hasOwnProperty(r.source)) {
                result[r.source] = Number(r.totalUsed) || 0;
            }
        });
    } catch (err) {
        logger.error('[getDisbursedBySource] ' + err.message);
    }
    return result;
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /finance/stats
 * Aggregated dashboard metrics for the Finance portal.
 */
const getFinanceStats = asyncHandler(async (req, res) => {
    let results;
    try {
        results = await Promise.all([
            Project.count(),
            Project.count({ where: { status: { [Op.in]: ['ACTIVE', 'APPROVED'] } } }),
            FundRequest.count({ where: { status: 'PENDING' } }),
            Project.sum('sanctionedBudget'),
            Disbursement.sum('amount'),
            User.count({ where: { role: 'FACULTY' } }),
            Revenue.sum('verifiedAmount', { where: { status: 'VERIFIED' } }),
            // Finance-activity counts used by FinanceDashboard
            FundRequest.count({ where: { status: 'PENDING_DISBURSAL' } }),
            FundRequest.count({
                where: {
                    status: 'DISBURSED',
                    currentStage: { [Op.in]: ['FUND_RELEASED', 'CHEQUE_RELEASED'] }
                }
            }),
            FundRequest.count({ where: { currentStage: 'UTILIZATION_COMPLETED' } }),
            InternshipFee.count({ where: { paymentStatus: 'PENDING' } }).catch(() => 0),
        ]);
    } catch (err) {
        logger.error('[getFinanceStats] DB Error: ' + err.message);
        results = Array(11).fill(0);
    }

    const [
        totalProjects, activeProjects, pendingApprovals,
        totalAllocated, totalDisbursed, totalFaculty, totalRevenue,
        pendingReleases, pendingDisbursements, pendingSettlements, pendingInternships
    ] = (results || []).map(v => v || 0);

    // Read fund source allocations from the FundSource table (real data, not hardcoded)
    let pfmsStats = { allotted: 0, consumed: 0 };
    let institutionalStats = { allotted: 0, consumed: 0 };
    let othersStats = { allotted: 0, consumed: 0 };

    try {
        const sources = await FundSource.findAll({ raw: true });
        const disbursedBySource = await getDisbursedBySource();

        sources.forEach(fs => {
            const name = SOURCE_TYPE_TO_NAME[fs.sourceType];
            const allotted = Number(fs.totalAllocated) || 0;
            if (name === 'PFMS') pfmsStats = { allotted, consumed: disbursedBySource.PFMS };
            if (name === 'INSTITUTIONAL') institutionalStats = { allotted, consumed: disbursedBySource.INSTITUTIONAL };
            if (name === 'OTHERS') othersStats = { allotted, consumed: disbursedBySource.OTHERS };
        });
    } catch (err) {
        logger.error('[getFinanceStats] FundSource read error: ' + err.message);
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
            pendingReleases,
            pendingDisbursements,
            pendingSettlements,
            pendingInternships,
            pfmsStats,
            institutionalStats,
            othersStats,
        }
    });
});

/**
 * GET /finance/fund-sources/overview
 * Returns fund source data with totalAllocated, totalUsed, remainingBalance
 * using FundSource table as source of truth + Disbursement for usage.
 */
const getFundSourcesOverview = asyncHandler(async (req, res) => {
    // 1. Read allocations from FundSource table (source of truth)
    let fundSources = [];
    try {
        await ensureCanonicalFundSources();
        fundSources = await FundSource.findAll({ raw: true });
    } catch (err) {
        logger.error('[getFundSourcesOverview] FundSource read error: ' + err.message);
    }

    // 2. Get used amounts from Disbursements joined with FundRequests
    const disbursedBySource = await getDisbursedBySource();

    // 3. Fallback: get project budget sums if FundSource amounts are 0
    let projectBudgetBySource = {};
    try {
        const projectSums = await Project.findAll({
            attributes: [
                'fundingSource',
                [fn('SUM', col('sanctionedBudget')), 'totalBudget']
            ],
            group: ['fundingSource'],
            raw: true
        });
        projectSums.forEach(p => {
            projectBudgetBySource[p.fundingSource] = Number(p.totalBudget) || 0;
        });
    } catch (err) {
        logger.error('[getFundSourcesOverview] Project sum error: ' + err.message);
    }

    // 4. Build response — keys exactly match FundSourceCard expectations:
    //    { name, totalAllocated, totalUsed, remainingBalance }
    const data = ['INSTITUTIONAL', 'PFMS', 'OTHERS'].map(name => {
        const sourceType = NAME_TO_SOURCE_TYPE[name];
        const fsRecord = fundSources.find(fs => fs.sourceType === sourceType);
        const fundSourceAllocated = fsRecord ? Number(fsRecord.totalAllocated) || 0 : 0;

        // Use FundSource allocation if set (> 0), otherwise fall back to project sums
        const totalAllocated = fundSourceAllocated > 0
            ? fundSourceAllocated
            : (projectBudgetBySource[name] || 0);
        const totalUsed = disbursedBySource[name] || 0;
        const remainingBalance = Math.max(0, totalAllocated - totalUsed);

        return { name, totalAllocated, totalUsed, remainingBalance };
    });

    res.json({ success: true, data });
});

/**
 * PUT /finance/funds/update
 * Update total allocated amount for a fund source.
 */
const updateFundSourceAmount = asyncHandler(async (req, res) => {
    const { type, amount, remarks } = req.body;
    if (!type || amount === undefined) {
        return res.status(400).json({ success: false, message: 'type and amount are required' });
    }

    const sourceType = NAME_TO_SOURCE_TYPE[type] || mapToFundSourceKey(type);
    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
        return res.status(400).json({ success: false, message: 'Amount must be a non-negative number' });
    }

    try {
        const [fundSource, created] = await FundSource.findOrCreate({
            where: { sourceType },
            defaults: { totalAllocated: numericAmount },
        });

        if (!created) {
            await fundSource.update({ totalAllocated: numericAmount });
        }

        logger.info(`[updateFundSourceAmount] ${sourceType} updated to ${numericAmount} by ${req.user?.name}. Remarks: ${remarks || 'N/A'}`);

        res.json({ success: true, data: fundSource });
    } catch (err) {
        logger.error('[updateFundSourceAmount] ' + err.message);
        res.status(500).json({ success: false, message: 'Failed to update fund source' });
    }
});

/**
 * GET /finance/departments
 * Returns departments list derived from Project data for the dropdown.
 */
const getDepartmentFinance = asyncHandler(async (req, res) => {
    let departments = [];
    try {
        departments = await Project.findAll({
            attributes: [
                'department',
                [fn('COUNT', col('_id')), 'count'],
                [fn('SUM', col('sanctionedBudget')), 'totalBudget']
            ],
            group: ['department'],
            raw: true
        });
    } catch (err) {
        logger.error('[getDepartmentFinance] DB Error: ' + err.message);
    }

    res.json({
        success: true,
        data: (Array.isArray(departments) ? departments : []).map((d, index) => ({
            id: d.department || `dept-${index}`,
            name: d.department || 'Unknown Department',
            department: d.department,
            count: Number(d.count) || 0,
            totalBudget: Number(d.totalBudget) || 0
        }))
    });
});

/**
 * GET /finance/departments/:id/funding
 * Returns funding breakdown for a specific department grouped by fundingSource.
 */
const getDepartmentFundingDetails = asyncHandler(async (req, res) => {
    const departmentId = req.params.id;
    let rows = [];
    try {
        rows = await Project.findAll({
            attributes: [
                'fundingSource',
                [fn('SUM', col('sanctionedBudget')), 'totalAllocated'],
                [fn('SUM', col('releasedBudget')), 'amountReleased'],
            ],
            where: { department: departmentId },
            group: ['fundingSource'],
            raw: true,
        });
    } catch (err) {
        logger.error('[getDepartmentFundingDetails] DB Error: ' + err.message);
    }

    const data = (Array.isArray(rows) ? rows : []).map(r => ({
        departmentName: departmentId,
        fundSource: r.fundingSource,
        totalAllocated: Number(r.totalAllocated) || 0,
        amountReleased: Number(r.amountReleased) || 0,
        remainingBalance: Math.max(0, (Number(r.totalAllocated) || 0) - (Number(r.amountReleased) || 0)),
    }));

    res.json({ success: true, data });
});

/**
 * POST /finance/funding/update
 * Update funding allocation for a department+source combination.
 */
const updateDepartmentFunding = asyncHandler(async (req, res) => {
    const { departmentId, fundSource, amount } = req.body;
    if (!departmentId || !fundSource || amount === undefined) {
        return res.status(400).json({ success: false, message: 'departmentId, fundSource, and amount are required' });
    }

    // Update all projects in this department with this funding source
    try {
        const projects = await Project.findAll({
            where: { department: departmentId, fundingSource: fundSource }
        });

        if (projects.length === 0) {
            return res.status(404).json({ success: false, message: 'No projects found for this department and fund source' });
        }

        // Distribute the amount proportionally across projects
        const totalCurrentBudget = projects.reduce((sum, p) => sum + Number(p.sanctionedBudget || 0), 0);

        for (const project of projects) {
            const ratio = totalCurrentBudget > 0
                ? Number(project.sanctionedBudget || 0) / totalCurrentBudget
                : 1 / projects.length;
            await project.update({ sanctionedBudget: Number(amount) * ratio });
        }

        res.json({ success: true, message: 'Funding updated successfully' });
    } catch (err) {
        logger.error('[updateDepartmentFunding] ' + err.message);
        res.status(500).json({ success: false, message: 'Failed to update department funding' });
    }
});

/**
 * GET /finance/disbursal-history
 */
const getDisbursalHistory = asyncHandler(async (req, res) => {
    let history = [];
    try {
        history = await Disbursement.findAll({
            attributes: [
                [fn('date_trunc', 'month', col('createdAt')), 'month'],
                [fn('SUM', col('amount')), 'total']
            ],
            group: [literal("date_trunc('month', \"createdAt\")")],
            order: [[literal("date_trunc('month', \"createdAt\")"), 'DESC']],
            limit: 12,
            raw: true
        });
    } catch (err) {
        logger.error('[getDisbursalHistory] DB Error: ' + err.message);
    }

    res.json({
        success: true,
        data: (Array.isArray(history) ? history : []).map(h => ({
            month: h.month,
            total: Number(h.total) || 0
        }))
    });
});

/**
 * GET /finance/reports-data
 */
const getReportsData = asyncHandler(async (req, res) => {
    let projectCounts = 0;
    let fundingSummary = [];
    let disbursalMeta = 0;

    try {
        [projectCounts, fundingSummary, disbursalMeta] = await Promise.all([
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
    } catch (err) {
        logger.error('[getReportsData] DB Error: ' + err.message);
    }

    res.json({
        success: true,
        data: {
            projects: projectCounts || {},
            funding: Array.isArray(fundingSummary) ? fundingSummary : [],
            totalDisbursed: disbursalMeta || 0,
            generatedAt: new Date().toISOString()
        }
    });
});

/**
 * GET /finance/pfms
 * Returns all PFMS transactions.
 */
const getPFMSTransactionsController = asyncHandler(async (req, res) => {
    let transactions = [];
    try {
        transactions = await PFMSTransaction.findAll({
            order: [['createdAt', 'DESC']],
            limit: 50,
            raw: true,
        });
    } catch (err) {
        logger.error('[getPFMSTransactions] DB Error: ' + err.message);
    }

    res.json({
        success: true,
        data: (Array.isArray(transactions) ? transactions : []).map(t => ({
            id: t.pfmsProjectId || t._id,
            projectId: t.projectId,
            organization: t.govtOrganization,
            sanctionOrder: t.sanctionOrderNo,
            sanctionDate: t.sanctionOrderDate,
            installment: t.installmentNumber,
            amount: `₹${Number(t.amountReleased || 0).toLocaleString()}`,
            creditDate: t.creditDate,
            utr: t.utrNumber,
            transactionId: t._id,
            status: t.ucStatus === 'SUBMITTED' ? 'Submitted' : 'Pending',
        }))
    });
});

/**
 * POST /finance/pfms
 * Create a new PFMS transaction.
 */
const createPFMSTransactionController = asyncHandler(async (req, res) => {
    const {
        projectId, pfmsProjectId, govtOrganization,
        sanctionOrderNo, sanctionOrderDate, installmentNumber,
        amountReleased, creditDate, utrNumber
    } = req.body;

    if (!projectId || !pfmsProjectId || !govtOrganization || !sanctionOrderNo) {
        return res.status(400).json({ success: false, message: 'Missing required PFMS fields' });
    }

    try {
        const transaction = await PFMSTransaction.create({
            projectId,
            pfmsProjectId,
            govtOrganization,
            sanctionOrderNo,
            sanctionOrderDate,
            installmentNumber: installmentNumber || 1,
            amountReleased: Number(amountReleased) || 0,
            creditDate,
            utrNumber,
        });

        res.status(201).json({ success: true, data: transaction });
    } catch (err) {
        logger.error('[createPFMSTransaction] ' + err.message);
        res.status(500).json({ success: false, message: 'Failed to create PFMS transaction' });
    }
});

/**
 * GET /finance/fund-flow
 * Returns fund requests in active pipeline stages for the Fund Flow Actions panel.
 */
const getFundFlowData = asyncHandler(async (req, res) => {
    let requests = [];
    try {
        requests = await FundRequest.findAll({
            where: {
                status: { [Op.in]: ['PENDING_DISBURSAL', 'DISBURSED'] },
                currentStage: {
                    [Op.in]: [
                        'FUND_APPROVED', 'FUND_RELEASED', 'BILLS_UPLOADED',
                        'CHEQUE_RELEASED', 'AMOUNT_DISBURSED'
                    ]
                }
            },
            order: [['updatedAt', 'DESC']],
            limit: 10,
            raw: true,
        });
    } catch (err) {
        logger.error('[getFundFlowData] DB Error: ' + err.message);
    }

    const STAGE_LABELS = {
        FUND_APPROVED: 'Fund Approved',
        FUND_RELEASED: 'Fund Released',
        BILLS_UPLOADED: 'Bills Uploaded',
        CHEQUE_RELEASED: 'Cheque Released',
        AMOUNT_DISBURSED: 'Amount Disbursed',
    };

    res.json({
        success: true,
        data: (Array.isArray(requests) ? requests : []).map(r => ({
            id: r._id,
            title: r.projectTitle,
            pi: r.faculty,
            department: r.department || r.centre || 'Research',
            status: r.currentStage,
            statusLabel: STAGE_LABELS[r.currentStage] || r.currentStage,
            amount: `₹${Number(r.requestedAmount || 0).toLocaleString()}`,
        }))
    });
});

module.exports = {
    getFinanceStats,
    getFundSourcesOverview,
    updateFundSourceAmount,
    getDepartmentFinance,
    getDepartmentFundingDetails,
    updateDepartmentFunding,
    getDisbursalHistory,
    getReportsData,
    getPFMSTransactionsController,
    createPFMSTransactionController,
    getFundFlowData,
};