const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const financeController = require('../controllers/financeController');
const projectController = require('../controllers/projectController');
const internshipController = require('../controllers/internshipController');
const fundRequestController = require('../controllers/fundRequestController');
const { sanitizeFinancialInput } = require('../middleware/inputSanitizer');

// All finance routes require authentication
router.use(protect);
router.use(require('../middleware/orgScope'));

// ── Core Dashboard & Overview ─────────────────────────────────────────────────
router.get('/stats', financeController.getFinanceStats);
router.get('/dashboard', financeController.getFinanceStats);
router.get('/fund-sources/overview', financeController.getFundSourcesOverview);
router.put('/funds/update', authorize('FINANCE_OFFICER', 'ADMIN'), sanitizeFinancialInput, financeController.updateFundSourceAmount);

// ── Departments ───────────────────────────────────────────────────────────────
router.get('/departments', financeController.getDepartmentFinance);
router.get('/departments/:id/funding', financeController.getDepartmentFundingDetails);
router.post('/funding/update', authorize('FINANCE_OFFICER', 'ADMIN'), sanitizeFinancialInput, financeController.updateDepartmentFunding);
router.get('/departments/:id/funding-history', async (req, res) => {
    // Return disbursement history filtered by department
    try {
        const { Disbursement, FundRequest } = require('../models');
        const { Op } = require('sequelize');
        const history = await Disbursement.findAll({
            include: [{
                model: FundRequest,
                as: 'FundRequest',
                where: { department: req.params.id },
                attributes: ['projectTitle', 'source', 'department'],
            }],
            order: [['createdAt', 'DESC']],
            limit: 50,
        });
        res.json({ success: true, data: history || [] });
    } catch (err) {
        console.error('[departments/:id/funding-history] DB Error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch funding history' });
    }
});

// ── Disbursal & Reports ───────────────────────────────────────────────────────
router.get('/disbursal-history', financeController.getDisbursalHistory);
router.get('/reports-data', financeController.getReportsData);
router.get('/financial-reports', financeController.getFinancialReports);
router.get('/financial-reports/export', financeController.exportFinancialReports);
router.get('/financial-reports/pdf', financeController.exportFinancialReportsPDF);

// ── Projects ──────────────────────────────────────────────────────────────────
router.get('/projects', projectController.getProjects);
router.get('/projects/:id', projectController.getProject);
router.post('/projects/:id/status', authorize('ADMIN', 'FINANCE_OFFICER'), projectController.updateProject);

router.get('/projects/:id/history', async (req, res) => {
    try {
        const { AuditLog } = require('../models');
        const history = await AuditLog.findAll({
            where: { entityId: req.params.id },
            order: [['createdAt', 'DESC']]
        });
        res.json({ success: true, data: history });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch project history' });
    }
});

// ── Disbursements ─────────────────────────────────────────────────────────────
router.get('/disbursements', (req, res, next) => {
    req.query = {
        ...req.query,
        status: req.query.status || 'APPROVED',
        limit: req.query.limit || '200',
    };
    return fundRequestController.getFundRequests(req, res, next);
});
router.put('/disbursements/:id/execute', authorize('FINANCE_OFFICER', 'ADMIN'), fundRequestController.disburseFund);
router.post('/disbursements/:id/rollback', authorize('ADMIN', 'FINANCE_OFFICER'), financeController.rollbackDisbursement);

// ── PFMS Transactions (real DB queries) ───────────────────────────────────────
router.get('/pfms', financeController.getPFMSTransactionsController);
router.post('/pfms', authorize('FINANCE_OFFICER', 'ADMIN'), financeController.createPFMSTransactionController);

// ── Fund Flow ─────────────────────────────────────────────────────────────────
router.get('/fund-flow', financeController.getFundFlowData);

// ── Internship Routes ─────────────────────────────────────────────────────────
router.get('/internship-fees', authorize('FINANCE_OFFICER', 'ADMIN'), internshipController.getInternshipFees);
router.post('/internship-fees', authorize('FINANCE_OFFICER', 'ADMIN'), internshipController.createInternshipFee);
router.put('/internship-fees/:id', authorize('FINANCE_OFFICER', 'ADMIN'), internshipController.updateInternshipFee);
router.delete('/internship-fees/:id', authorize('ADMIN'), internshipController.deleteInternshipFee);
router.put('/internship-fees/:id/verify', authorize('FINANCE_OFFICER'), internshipController.verifyInternshipFee);

router.get('/admin-internships', authorize('ADMIN'), internshipController.getAdminInternships);
router.put('/admin-internships/:id/approve', authorize('ADMIN'), internshipController.approveInternship);

// ── Equipment Disbursements ───────────────────────────────────────────────────
router.get('/equipment-disbursements', async (req, res) => {
    try {
        const { FundRequest } = require('../models');
        const eqReqs = await FundRequest.findAll({
            where: { projectTitle: { [require('sequelize').Op.like]: '%Equipment%' } },
            order: [['createdAt', 'DESC']],
            limit: 50,
        });
        res.json({ success: true, data: eqReqs || [] });
    } catch (err) {
        console.error('[equipment-disbursements] DB Error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch equipment disbursements' });
    }
});

// ── Function Requests (Events/Functions) ──────────────────────────────────────
router.get('/function-requests', async (req, res) => {
    try {
        const { FundRequest } = require('../models');
        const { Op } = require('sequelize');
        const fnReqs = await FundRequest.findAll({
            where: {
                [Op.or]: [
                    { purpose: { [Op.like]: '%FUNCTION%' } },
                    { purpose: { [Op.like]: '%EVENT%' } },
                    { purpose: { [Op.like]: '%function%' } },
                    { purpose: { [Op.like]: '%event%' } },
                ]
            },
            order: [['createdAt', 'DESC']],
            limit: 50,
        });
        res.json({ success: true, data: fnReqs || [] });
    } catch (err) {
        console.error('[function-requests] DB Error:', err.message);
        res.status(500).json({ success: false, message: 'Failed to fetch function requests' });
    }
});

module.exports = router;
