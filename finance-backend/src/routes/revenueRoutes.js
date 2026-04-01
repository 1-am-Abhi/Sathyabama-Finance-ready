const express = require('express');
const router = express.Router();
const revenueController = require('../controllers/revenueController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, revenueController.createRevenueRecord);
router.get('/my-records', protect, revenueController.getMyRevenueRecords);
router.get('/summary', protect, revenueController.getRevenueSummary);

// Admin-only metrics update (Finance department access)
router.patch('/:id/finance', protect, authorize('ADMIN'), revenueController.updateFinanceMetrics);

module.exports = router;
