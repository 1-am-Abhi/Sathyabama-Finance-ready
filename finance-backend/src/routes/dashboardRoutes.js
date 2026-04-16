const express = require('express');
const projectController = require('../controllers/projectController');
const financeController = require('../controllers/financeController');
const dashboardController = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/admin/dashboard', protect, authorize('ADMIN'), projectController.getAdminStats);
router.get('/faculty/dashboard', protect, authorize('FACULTY'), projectController.getFacultyStats);
router.get('/finance/dashboard', protect, authorize('FINANCE_OFFICER', 'ADMIN'), financeController.getFinanceDashboard);

// ✅ FIXED LINE (will now work)
router.get('/dashboard/metrics', protect, dashboardController.getGlobalMetrics);

module.exports = router;