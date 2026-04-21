const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Only Admin and Finance Officer can see raw forecasting data and insights
router.get('/forecast-base', authorize('ADMIN', 'FINANCE_OFFICER'), analyticsController.getForecastBase);
router.get('/insights', authorize('ADMIN', 'FINANCE_OFFICER'), analyticsController.getInsights);

module.exports = router;
