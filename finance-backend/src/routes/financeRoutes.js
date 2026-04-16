const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const financeController = require('../controllers/financeController');

// All finance routes require authentication
router.use(protect);

// Mapped Routes to Real Controllers
router.get('/stats', financeController.getFinanceStats);
router.get('/projects', projectController.getProjects);
router.get('/fund-sources/overview', financeController.getFundSourcesOverview);

router.get('/departments', financeController.getDepartmentFinance);
router.get('/disbursal-history', financeController.getDisbursalHistory);
router.get('/reports-data', financeController.getReportsData);

// Fallbacks for remaining secondary modules

const safeFallback = (req, res) => {
    res.json({ success: true, data: [], meta: {} });
};
router.get('/pfms', safeFallback);
router.get('/fund-flow', safeFallback);
router.get('/reports-data', safeFallback);


module.exports = router;
