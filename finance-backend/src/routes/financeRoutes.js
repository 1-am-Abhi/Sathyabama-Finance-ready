const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All finance routes require being a FINANCE_OFFICER or ADMIN
router.use(protect);
router.use(authorize('FINANCE_OFFICER', 'ADMIN'));

router.get('/stats', financeController.getFinanceStats);
router.get('/dashboard', financeController.getFinanceDashboard);
router.get('/fund-flow', financeController.getFundFlowProjects);

router.post('/pfms', financeController.createPFMSTransaction);
router.get('/pfms', financeController.getPFMSTransactions);

router.get('/internship-fees', financeController.getInternshipFees);
router.post('/internship-fees', financeController.createInternshipFee);
router.put('/internship-fees/:id/verify', financeController.verifyInternshipFee);
router.put('/internship-fees/:id', financeController.verifyInternshipFee);
router.delete('/internship-fees/:id', financeController.deleteInternshipFee);

// Admin Internship Routing
router.get('/admin-internships', financeController.getAdminInternshipFees);
router.put('/admin-internships/:id/approve', financeController.adminApproveInternshipFee);

// New Pipeline Routes
router.get('/disbursements', financeController.getDisbursementQueue);
router.get('/history', financeController.getDisbursalHistory);
router.get('/disbursal-history', financeController.getDisbursalHistory);
router.put('/disbursements/:id/execute', financeController.executeDisbursement);

router.get('/equipment-disbursements', financeController.getEquipmentDisbursements);
router.put('/equipment-disbursements/:id/execute', financeController.executeEquipmentDisbursement);

// Final Reports Data Pipeline
router.get('/reports-data', financeController.getFinancialReports);

// New Dashboard Routes
router.get('/fund-sources/overview', financeController.getFundSourcesOverview);
router.post('/fund-sources/update', financeController.updateFundSourceAmount);
router.put('/fund-sources/update', financeController.updateFundSourceAmount);
router.put('/funds/update', financeController.updateFundSourceAmount);
router.get('/departments', financeController.getDepartments);
router.get('/departments/:id/funding', financeController.getDepartmentFunding);
router.post('/funding/update', financeController.updateDepartmentFunding);
router.get('/function-requests', financeController.getFunctionRequests);
router.get('/projects', financeController.getProjects);

module.exports = router;
