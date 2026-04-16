const express = require('express');
const projectController = require('../controllers/projectController');
const financeController = require('../controllers/financeController');
const dashboardController = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Runtime Validation (Safe-guard for production)
if (typeof protect !== 'function') throw new Error('[Router] protect middleware is not a function');
if (typeof authorize !== 'function') throw new Error('[Router] authorize middleware is not a function');
if (typeof projectController.getAdminStats !== 'function') throw new Error('[Router] getAdminStats is not a function');
if (typeof financeController.getFinanceStats !== 'function') throw new Error('[Router] getFinanceStats is not a function');
if (typeof dashboardController.getGlobalMetrics !== 'function') throw new Error('[Router] getGlobalMetrics is not a function');

router.get('/admin/dashboard', protect, authorize('ADMIN'), projectController.getAdminStats);
router.get('/faculty/dashboard', protect, authorize('FACULTY'), projectController.getFacultyStats);
router.get('/finance/dashboard', protect, authorize('FINANCE_OFFICER', 'ADMIN'), financeController.getFinanceStats);

router.get('/dashboard/metrics', protect, dashboardController.getGlobalMetrics);

module.exports = router;