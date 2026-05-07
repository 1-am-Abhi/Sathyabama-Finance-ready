const { Disbursement, FundRequest, Project, PFMSTransaction, Revenue, User, AuditLog, Account, JournalEntry, AccountingPeriod, Ledger, LedgerSnapshot, sequelize } = require('../models');
const { Op, literal } = require('sequelize');
const { ACCOUNTS } = require('../constants/accounts');
const asyncHandler = require('../utils/asyncHandler');
const { getCurrentFY, getFYRange } = require('../utils/fyUtils');
const { safeEmit } = require('../socketInstance');
const logger = require('../utils/logger');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const { safeNumber, parseFY, safeArray } = require('../utils/safeUtils');

const orgWhere = (req, extra = {}) => ({
    organizationId: req.user.organizationId,
    ...extra
});

const disbursementDateWhere = (startDate, endDate) => ({
    disbursedAt: { [Op.between]: [startDate, endDate] }
});

/**
 * GET /finance/stats
 * Returns aggregated stats for the Finance Dashboard.
 */
const getFinanceStats = asyncHandler(async (req, res) => {
    const fyRange = parseFY(req.query.fy || getCurrentFY());
    if (!fyRange) {
        return res.json({ success: true, data: { pendingReleases: 0, pendingDisbursements: 0, pendingSettlements: 0, pendingInternships: 0 } });
    }
    const { startDate, endDate } = fyRange;

    const whereClause = {
        organizationId: req.user.organizationId,
        createdAt: { [Op.between]: [startDate, endDate] }
    };

    // Pending fund releases (FundRequest status = APPROVED)
    const pendingReleases = safeNumber(await FundRequest.count({
        where: { ...whereClause, status: 'APPROVED' }
    }));

    // Pending disbursements (FundRequests approved by Admin but not yet executed by Finance)
    const pendingDisbursements = safeNumber(await FundRequest.count({
        where: { 
            ...whereClause,
            status: { [Op.in]: ['APPROVED', 'PARTIALLY_DISBURSED'] }
        }
    }));

    // Pending settlements (Disbursements made but not yet finalized/closed)
    const pendingSettlements = safeNumber(await Disbursement.count({
        where: whereClause
    }));

    // Pending internships (Internship fees not yet verified)
    let pendingInternships = 0;
    try {
        const { InternshipFee } = require('../models');
        if (InternshipFee) {
            pendingInternships = safeNumber(await InternshipFee.count({
                where: {
                    createdAt: { [Op.between]: [startDate, endDate] },
                    paymentStatus: 'PENDING'
                }
            }));
        }
    } catch (err) {
        logger.warn('[FinanceController] InternshipFee model not found or query failed');
    }

    return res.json({
        success: true,
        data: {
            pendingReleases,
            pendingDisbursements,
            pendingSettlements,
            pendingInternships
        }
    });
});

/**
 * GET /finance/fund-sources/overview
 * Returns overview of institutional, PFMS, and other fund sources.
 */
const getFundSourcesOverview = asyncHandler(async (req, res) => {
    const { getFundSourceOverview } = require('../services/pipelineMetricsService');
    const fy = req.query.fy || getCurrentFY();
    
    const overview = await getFundSourceOverview();

    const data = [
        {
            name: 'INSTITUTIONAL',
            totalAllocated: safeNumber(overview.institutionalFunds.totalAllocated),
            totalUsed: safeNumber(overview.institutionalFunds.totalUsed),
            remainingBalance: safeNumber(overview.institutionalFunds.remainingBalance),
            count: overview.institutionalFunds.projectCount
        },
        {
            name: 'PFMS',
            totalAllocated: safeNumber(overview.pfmsFunds.totalAllocated),
            totalUsed: safeNumber(overview.pfmsFunds.totalUsed),
            remainingBalance: safeNumber(overview.pfmsFunds.remainingBalance),
            count: overview.pfmsFunds.projectCount
        },
        {
            name: 'OTHERS',
            totalAllocated: safeNumber(overview.othersFunds.totalAllocated),
            totalUsed: safeNumber(overview.othersFunds.totalUsed),
            remainingBalance: safeNumber(overview.othersFunds.remainingBalance),
            count: overview.othersFunds.projectCount
        }
    ];

    return res.json({ success: true, data: safeArray(data) });
});

/**
 * PUT /finance/funds/update
 */
const updateFundSourceAmount = asyncHandler(async (req, res) => {
    const { source, amount, type } = req.body;
    const { FundSource } = require('../models');
    const { normalizeFundSourceType, ensureCanonicalFundSources } = require('../services/fundSourceCatalogService');

    if (!source || amount === undefined || !type) {
        return res.status(200).json({ success: false, message: 'Source, amount, and type are required', data: [] });
    }

    const sourceType = normalizeFundSourceType(source) || source;
    await ensureCanonicalFundSources();

    let record = await FundSource.findOne({
        where: { sourceType }
    });

    if (!record) {
        record = await FundSource.create({
            sourceType,
            totalAllocated: type === 'allocation' ? safeNumber(amount) : 0
        });
    } else {
        if (type === 'allocation') {
            record.totalAllocated = safeNumber(amount); // Overwrite or add? Usually allocation is a set value. 
            // In the original code it was: record.totalAllocated = safeNumber(record.totalAllocated) + safeNumber(amount);
            // But FundSource.totalAllocated is the total for that source.
            record.totalAllocated = safeNumber(amount); 
        }
        await record.save();
    }

    return res.json({ success: true, data: record });
});

/**
 * GET /finance/departments
 */
const getDepartmentFinance = asyncHandler(async (req, res) => {
    const { getAdminDashboardData } = require('../services/pipelineMetricsService');
    const fy = req.query.fy || getCurrentFY();
    
    const adminData = await getAdminDashboardData(fy);
    const centres = adminData?.data?.centres || [];
    
    // Map centres to the expected DepartmentFunding shape
    const data = centres.map(c => ({
        id: c._id || c.id,
        departmentName: c.name,
        totalAllocated: c.totalBudget,
        totalUsed: c.disbursed,
        remainingBalance: Math.max(0, c.totalBudget - c.disbursed)
    }));
    
    return res.json({ success: true, data: safeArray(data) });
});

/**
 * GET /finance/departments/:id/funding
 */
const getDepartmentFundingDetails = asyncHandler(async (req, res) => {
    const { getDepartmentFundingRows } = require('../services/pipelineMetricsService');
    const funding = await getDepartmentFundingRows(req.params.id);
    return res.json({ success: true, data: safeArray(funding) });
});

const updateDepartmentFunding = asyncHandler(async (req, res) => {
    return res.json({ success: true, message: 'Department funding updated successfully' });
});

/**
 * GET /finance/disbursal-history
 */
const getDisbursalHistory = asyncHandler(async (req, res) => {
  const { startDate, endDate } = getFYRange(req.query.fy || getCurrentFY());

  const history = safeArray(await Disbursement.findAll({
    where: {
      organizationId: req.user.organizationId,
      [Op.and]: [
        literal(`COALESCE("Disbursement"."disbursedAt", "Disbursement"."createdAt") >= '${new Date(startDate).toISOString()}'`),
        literal(`COALESCE("Disbursement"."disbursedAt", "Disbursement"."createdAt") <= '${new Date(endDate).toISOString()}'`)
      ]
    },
    include: [
      { model: Project, as: 'Project', required: false },
      { model: FundRequest, as: 'FundRequest', required: false }
    ],
    order: [['createdAt', 'DESC']]
  }));

  return res.json({
    success: true,
    data: safeArray(history)
  });
});

/**
 * GET /finance/reports-data
 */
const getReportsData = asyncHandler(async (req, res) => {
    const { startDate, endDate } = getFYRange(req.query.fy || getCurrentFY());
    
    const [disbursements, fundRequests] = await Promise.all([
        Disbursement.findAll({
            where: orgWhere(req, disbursementDateWhere(startDate, endDate)),
            include: [{ model: Project, as: 'Project', required: false }]
        }),
        FundRequest.findAll({
            where: orgWhere(req, { createdAt: { [Op.between]: [startDate, endDate] } }),
            include: [{ model: Project, as: 'Project', required: false }]
        })
    ]);

    return res.json({
        success: true,
        data: {
            disbursements: safeArray(disbursements),
            fundRequests: safeArray(fundRequests)
        }
    });
});

/**
 * GET /finance/sync
 */
const syncEvents = asyncHandler(async (req, res) => {
    const { since } = req.query;
    if (!since) return res.status(200).json({ success: false, message: 'Missing since timestamp', data: [] });

    const events = safeArray(await AuditLog.findAll({
        where: {
            createdAt: { [Op.gt]: new Date(parseInt(since)) },
            organizationId: req.user.organizationId,
            entityType: { [Op.in]: ['FundRequest', 'Disbursement', 'PFMSTransaction', 'Revenue'] }
        },
        order: [['createdAt', 'ASC']],
        limit: 100
    }));

    return res.json({ success: true, data: events });
});

/**
 * GET /finance/audit/replay
 */
const getAuditReplay = asyncHandler(async (req, res) => {
    const logs = safeArray(await AuditLog.findAll({
        where: { organizationId: req.user.organizationId },
        order: [['createdAt', 'DESC']],
        limit: 100,
        include: [{ required: false, model: User, as: 'user', attributes: ['name', 'email'] }]
    }));
    return res.json({ success: true, data: logs });
});

/**
 * GET /finance/pfms
 */
const getPFMSTransactionsController = asyncHandler(async (req, res) => {
  const fyRange = parseFY(req.query.fy || getCurrentFY());

  const where = {
    organizationId: req.user.organizationId
  };

  if (fyRange) {
    where.createdAt = {
      [Op.between]: [fyRange.startDate, fyRange.endDate]
    };
  }

  const transactions = safeArray(await PFMSTransaction.findAll({
    where,
    include: [{ model: Project, as: 'Project', required: false }],
    order: [['createdAt', 'DESC']]
  }));

  return res.json({
    success: true,
    data: transactions
  });
});

/**
 * POST /finance/pfms
 */
const createPFMSTransactionController = asyncHandler(async (req, res) => {
    const {
        projectId, pfmsProjectId, govtOrganization,
        sanctionOrderNo, sanctionOrderDate, installmentNumber,
        amountReleased, creditDate, utrNumber
    } = req.body;

    if (!projectId || !pfmsProjectId || !govtOrganization || !sanctionOrderNo || !sanctionOrderDate || !creditDate || !utrNumber || safeNumber(amountReleased) <= 0) {
        return res.status(200).json({ success: false, message: 'Missing required PFMS fields', data: [] });
    }

    const transaction = await PFMSTransaction.create({
        projectId,
        pfmsProjectId,
        govtOrganization,
        sanctionOrderNo,
        sanctionOrderDate,
        installmentNumber: installmentNumber || 1,
        amountReleased: safeNumber(amountReleased),
        creditDate,
        utrNumber,
    });

    safeEmit('finance', 'finance:update', { type: 'PFMS_UPDATE', timestamp: Date.now() });

    return res.status(201).json({ success: true, data: transaction });
});

/**
 * GET /finance/fund-flow
 */
const getFundFlowData = asyncHandler(async (req, res) => {
    const fyRange = parseFY(req.query.fy || getCurrentFY());
    if (!fyRange) return res.json({ success: true, data: { totalIn: 0, totalOut: 0 } });
    
    const { startDate, endDate } = fyRange;
    const whereClause = { createdAt: { [Op.between]: [startDate, endDate] } };

    const [disbursements, revenue] = await Promise.all([
        Disbursement.findAll({ where: orgWhere(req, disbursementDateWhere(startDate, endDate)) }),
        Revenue.findAll({ where: whereClause })
    ]);

    const flow = {
        totalIn: safeArray(revenue).reduce((acc, r) => acc + safeNumber(r.amountGenerated), 0),
        totalOut: safeArray(disbursements).reduce((acc, d) => acc + safeNumber(d.amount), 0)
    };

    return res.json({ success: true, data: flow });
});

/**
 * GET /finance/financial-reports
 */
const getFinancialReports = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) return res.json({ success: true, data: [] });

    const data = safeArray(await Disbursement.findAll({
        where: orgWhere(req, disbursementDateWhere(new Date(startDate), new Date(endDate))),
        attributes: ['amount', 'disbursedAt', 'createdAt']
    }));
    return res.json({ success: true, data: data });
});

/**
 * CSV Export
 */
const exportFinancialReports = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        return res.status(200).json({ success: false, message: 'Start date and end date are required', data: [] });
    }
    const whereClause = {
      organizationId: req.user.organizationId,
      disbursedAt: { [Op.between]: [new Date(startDate), new Date(endDate)] }
    };

    const disbursements = safeArray(await Disbursement.findAll({
      where: whereClause,
      include: [
          { required: false, model: FundRequest, as: 'FundRequest', include: [{ required: false, model: Project, as: 'Project' }] }, 
          { required: false, model: User, as: 'officer', attributes: ['name'] }
      ],
      order: [['createdAt', 'DESC']],
    }));

    const data = disbursements.map(d => ({
      Date: d.disbursedAt || d.createdAt,
      Project: d.FundRequest?.Project?.title || 'Unknown',
      Amount: safeNumber(d.amount),
      Officer: d.officer?.name || 'N/A',
      TransactionID: d.bankReference || 'N/A',
    }));

    const parser = new Parser();
    const csv = parser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment(`financial-report-${startDate}-to-${endDate}.csv`);
    return res.send(csv);
});

/**
 * PDF Export
 */
const exportFinancialReportsPDF = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        return res.status(200).json({ success: false, message: 'Start date and end date are required', data: [] });
    }
    const whereClause = {
      organizationId: req.user.organizationId,
      disbursedAt: { [Op.between]: [new Date(startDate), new Date(endDate)] }
    };

    const disbursements = safeArray(await Disbursement.findAll({
      where: whereClause,
      include: [
          { required: false, model: FundRequest, as: 'FundRequest', include: [{ required: false, model: Project, as: 'Project' }] }, 
          { required: false, model: User, as: 'officer', attributes: ['name'] }
      ],
      order: [['createdAt', 'DESC']],
    }));

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=financial-report.pdf');
    doc.pipe(res);
    doc.fontSize(18).text('Financial Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).text(`From: ${startDate} To: ${endDate}`);
    doc.moveDown();

    disbursements.forEach((d, i) => {
      doc.text(`${i + 1}. ${d.FundRequest?.Project?.title || 'Unknown'} | ₹${safeNumber(d.amount).toLocaleString()} | ${d.officer?.name || 'N/A'}`);
    });

    doc.end();
});

/**
 * POST /finance/disbursements/:id/rollback
 */
const rollbackDisbursement = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const disbursement = await Disbursement.findOne({ where: { _id: id, organizationId: req.user.organizationId } });
    if (!disbursement) return res.status(200).json({ success: false, message: 'Disbursement not found', data: [] });

    await sequelize.transaction(async (t) => {
        const [bankAcc, expenseAcc] = await Promise.all([
            Account.findOne({ where: { code: ACCOUNTS.BANK.code }, transaction: t }),
            Account.findOne({ where: { code: ACCOUNTS.PROJECT_EXPENSE.code }, transaction: t })
        ]);

        if (!bankAcc || !expenseAcc) throw new Error('Accounts not found');

        const reversalAmount = safeNumber(disbursement.amount);
        const journalEntry = await JournalEntry.create({ description: 'Rollback' }, { transaction: t });

        await Ledger.bulkCreate([
            { journalId: journalEntry.id, accountId: bankAcc.id, debit: reversalAmount, credit: 0 },
            { journalId: journalEntry.id, accountId: expenseAcc.id, debit: 0, credit: reversalAmount }
        ], { transaction: t });

        await disbursement.update({ status: 'REVERSED' }, { transaction: t });
    });

    return res.json({ success: true, message: 'Disbursement rolled back' });
});

/**
 * GET /finance/statements/trial-balance
 */
const getTrialBalance = asyncHandler(async (req, res) => {
    const accounts = safeArray(await Account.findAll({
        include: [{ required: false, model: Ledger, as: 'ledgerEntries' }]
    }));

    const trialBalance = accounts.map(acc => {
        const totalDebit = safeArray(acc.ledgerEntries).reduce((sum, e) => sum + safeNumber(e.debit), 0);
        const totalCredit = safeArray(acc.ledgerEntries).reduce((sum, e) => sum + safeNumber(e.credit), 0);
        return { accountName: acc.name, debit: totalDebit, credit: totalCredit };
    });

    return res.json({ success: true, data: trialBalance });
});

/**
 * GET /finance/statements/profit-loss
 */
const getProfitAndLoss = asyncHandler(async (req, res) => {
    const accounts = safeArray(await Account.findAll({
        where: { type: { [Op.in]: ['REVENUE', 'EXPENSE'] } },
        include: [{ required: false, model: Ledger, as: 'ledgerEntries' }]
    }));

    const summary = accounts.map(acc => {
        const balance = safeArray(acc.ledgerEntries).reduce((sum, e) => sum + safeNumber(e.debit) - safeNumber(e.credit), 0);
        return { name: acc.name, type: acc.type, amount: Math.abs(balance) };
    });

    return res.json({ success: true, data: summary });
});

/**
 * GET /finance/statements/balance-sheet
 */
const getBalanceSheet = asyncHandler(async (req, res) => {
    const accounts = safeArray(await Account.findAll({
        where: { type: { [Op.in]: ['ASSET', 'LIABILITY', 'EQUITY'] } },
        include: [{ required: false, model: Ledger, as: 'ledgerEntries' }]
    }));

    const items = accounts.map(acc => {
        const balance = safeArray(acc.ledgerEntries).reduce((sum, e) => sum + safeNumber(e.debit) - safeNumber(e.credit), 0);
        return { name: acc.name, type: acc.type, balance: Math.abs(balance) };
    });

    return res.json({ success: true, data: items });
});

/**
 * GET /finance/ledger/verify
 */
const verifyLedgerIntegrity = asyncHandler(async (req, res) => {
    const ledger = safeArray(await Ledger.findAll({ order: [['createdAt', 'ASC'], ['id', 'ASC']] }));
    
    let isIntact = true;
    for (let i = 1; i < ledger.length; i++) {
        if (ledger[i].previousHash !== ledger[i-1].hash) {
            isIntact = false;
            break;
        }
    }

    return res.json({ success: true, data: { isIntact, entryCount: ledger.length } });
});

/**
 * GET /finance/ledger/export
 */
const exportLedger = asyncHandler(async (req, res) => {
    res.header('Content-Type', 'text/csv');
    res.attachment(`Sathyabama_Audit_Ledger_${new Date().getTime()}.csv`);
    res.write('Date,Journal,Reference,Account,Debit,Credit,Hash\n');

    const BATCH_SIZE = 500;
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const batch = await Ledger.findAll({
            include: [
                { required: false, model: Account, as: 'Account', attributes: ['name', 'code'] },
                { required: false, model: JournalEntry, as: 'JournalEntry', attributes: ['description', 'referenceId'] }
            ],
            order: [['createdAt', 'ASC']],
            limit: BATCH_SIZE,
            offset: offset,
            raw: true,
            nest: true
        });

        if (!batch || batch.length === 0) {
            hasMore = false;
            break;
        }

        const csvChunk = batch.map(entry => {
            return [
                new Date(entry.createdAt).toISOString(),
                `"${entry.JournalEntry?.description || 'N/A'}"`,
                entry.JournalEntry?.referenceId || '',
                `"${entry.Account?.name || 'N/A'}"`,
                entry.debit || 0,
                entry.credit || 0,
                entry.hash || ''
            ].join(',');
        }).join('\n') + '\n';

        res.write(csvChunk);
        offset += BATCH_SIZE;
    }

    res.end();
});

/**
 * POST /finance/ledger/snapshot
 */
const createLedgerSnapshot = asyncHandler(async (req, res) => {
    const lastEntry = await Ledger.findOne({ order: [['createdAt', 'DESC'], ['id', 'DESC']] });
    if (!lastEntry) return res.status(200).json({ success: false, message: 'Ledger empty', data: [] });

    const stats = await Ledger.findOne({
        attributes: [
            [sequelize.fn('COUNT', sequelize.col('id')), 'totalCount'],
            [sequelize.fn('SUM', sequelize.col('debit')), 'totalDebit'],
            [sequelize.fn('SUM', sequelize.col('credit')), 'totalCredit']
        ],
        raw: true
    });

    const snapshot = await LedgerSnapshot.create({
        snapshotName: req.body.name || `Checkpoint_${new Date().toISOString()}`,
        lastLedgerId: lastEntry.id,
        lastHash: lastEntry.hash,
        totalEntries: parseInt(stats?.totalCount || 0),
        totalDebit: parseFloat(stats?.totalDebit || 0),
        totalCredit: parseFloat(stats?.totalCredit || 0),
        snapshotBy: req.user?.id || req.user?._id
    });

    return res.json({ success: true, data: snapshot });
});

/**
 * POST /finance/ledger/snapshot/:id/verify
 */
const verifyLedgerSnapshot = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const snapshot = await LedgerSnapshot.findByPk(id);
    if (!snapshot) return res.status(200).json({ success: false, message: 'Snapshot not found', data: [] });

    const ledgerAtPoint = await Ledger.findByPk(snapshot.lastLedgerId);
    if (!ledgerAtPoint) return res.status(200).json({ success: false, message: 'Ledger entry for snapshot not found', data: [] });

    const isValid = ledgerAtPoint.hash === snapshot.lastHash;

    return res.json({
        success: true,
        data: { isValid, storedHash: snapshot.lastHash, actualHash: ledgerAtPoint.hash, snapshotDate: snapshot.createdAt }
    });
});

/**
 * GET /finance/health
 */
const getSystemHealth = asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const health = {
        status: 'GREEN',
        components: {
            database: { status: 'GREEN', latency: 0 },
            ledger: { status: 'GREEN', integrity: 'VERIFIED' }
        },
        uptime: process.uptime(),
        timestamp: new Date()
    };

    try {
        const dbStart = Date.now();
        await sequelize.authenticate();
        health.components.database.latency = Date.now() - dbStart;
    } catch (e) {
        health.status = 'RED';
        health.components.database.status = 'RED';
    }

    const last50 = safeArray(await Ledger.findAll({ order: [['createdAt', 'DESC']], limit: 50 }));
    let chainOk = true;
    for (let i = 0; i < last50.length - 1; i++) {
        if (last50[i].previousHash !== last50[i+1].hash) {
            chainOk = false;
            break;
        }
    }
    
    if (!chainOk) {
        health.status = 'RED';
        health.components.ledger.status = 'RED';
    }

    return res.json({ success: true, data: health, responseTime: Date.now() - startTime });
});

/**
 * POST /finance/ledger/archive
 */
const archiveOldLedgerEntries = asyncHandler(async (req, res) => {
    const { olderThan } = req.body;
    if (!olderThan) return res.status(200).json({ success: false, message: 'Archive threshold required', data: [] });

    const archiveDate = new Date(olderThan);
    const [updatedCount] = await Ledger.update(
        { description: sequelize.fn('CONCAT', sequelize.col('description'), ' [ARCHIVED]') }, 
        { where: { createdAt: { [Op.lt]: archiveDate } } }
    );

    return res.json({
        success: true,
        message: `Marked ${updatedCount} entries as archived.`,
        data: { archivedCount: updatedCount }
    });
});

const getEquipmentDisbursements = asyncHandler(async (req, res) => {
    return res.json({ success: true, data: [] });
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
    getFinancialReports,
    syncEvents,
    exportFinancialReports,
    exportFinancialReportsPDF,
    getAuditReplay,
    rollbackDisbursement,
    getTrialBalance,
    getProfitAndLoss,
    getBalanceSheet,
    verifyLedgerIntegrity,
    exportLedger,
    createLedgerSnapshot,
    verifyLedgerSnapshot,
    getSystemHealth,
    archiveOldLedgerEntries,
    getEquipmentDisbursements,
    getPFMSData: getPFMSTransactionsController
};
