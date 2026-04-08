const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All finance routes require being a FINANCE_OFFICER or ADMIN
router.use(protect);
router.use(authorize('FINANCE_OFFICER', 'ADMIN'));

router.get('/stats', financeController.getFinanceStats);
router.get('/fund-flow', financeController.getFundFlowProjects);

router.post('/pfms', financeController.createPFMSTransaction);
router.get('/pfms', financeController.getPFMSTransactions);

router.get('/internship-fees', financeController.getInternshipFees);
router.put('/internship-fees/:id/verify', financeController.verifyInternshipFee);

// New Pipeline Routes
router.get('/disbursements', financeController.getDisbursementQueue);
router.put('/disbursements/:id/execute', financeController.executeDisbursement);

// Final Reports Data Pipeline
router.get('/reports-data', financeController.getFinancialReports);

// New Dashboard Routes
router.get('/fund-sources/overview', financeController.getFundSourcesOverview);
router.post('/fund-sources/update', financeController.updateFundSourceAmount);
router.get('/departments', financeController.getDepartments);
router.get('/departments/:id/funding', financeController.getDepartmentFunding);
router.post('/funding/update', financeController.updateDepartmentFunding);
router.get('/function-requests', financeController.getFunctionRequests);
router.get('/projects', financeController.getProjects);

module.exports = router;
