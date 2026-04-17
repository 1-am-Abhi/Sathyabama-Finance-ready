const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const financeController = require('../controllers/financeController');
const projectController = require('../controllers/projectController');
const internshipController = require('../controllers/internshipController');

// All finance routes require authentication
router.use(protect);

// Mapped Routes to Real Controllers
router.get('/stats', financeController.getFinanceStats);
router.get('/projects', projectController.getProjects);
router.get('/fund-sources/overview', financeController.getFundSourcesOverview);

router.get('/departments', financeController.getDepartmentFinance);
router.get('/disbursal-history', financeController.getDisbursalHistory);
router.get('/reports-data', financeController.getReportsData);

// Internship Routes (requested by Admin & Finance dashboards)
router.get('/internship-fees', authorize('FINANCE_OFFICER', 'ADMIN'), internshipController.getInternshipFees);
router.post('/internship-fees', authorize('FINANCE_OFFICER', 'ADMIN'), internshipController.createInternshipFee);
router.put('/internship-fees/:id', authorize('FINANCE_OFFICER', 'ADMIN'), internshipController.updateInternshipFee);
router.delete('/internship-fees/:id', authorize('ADMIN'), internshipController.deleteInternshipFee);
router.put('/internship-fees/:id/verify', authorize('FINANCE_OFFICER'), internshipController.verifyInternshipFee);

router.get('/admin-internships', authorize('ADMIN'), internshipController.getAdminInternships);
router.put('/admin-internships/:id/approve', authorize('ADMIN'), internshipController.approveInternship);

// Fallbacks for remaining secondary modules
const safeFallback = (req, res) => {
    res.json({ success: true, data: [], meta: {} });
};

router.get('/pfms', safeFallback);
router.get('/fund-flow', safeFallback);

module.exports = router;


