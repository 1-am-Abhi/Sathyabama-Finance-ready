const express = require('express');
const router = express.Router();
const revenueController = require('../controllers/revenueController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, revenueController.createRevenueRecord);
router.get('/my-records', protect, revenueController.getMyRevenueRecords);
router.get('/summary', protect, revenueController.getRevenueSummary);

// Admin-only metrics update (Finance department access)
router.patch('/:id/finance', protect, authorize('ADMIN'), revenueController.updateFinanceMetrics);

// Finance Verification Pipeline
router.get('/verification-queue', protect, authorize('FINANCE_OFFICER'), revenueController.getAllRevenueForVerification);
router.put('/:id/verify', protect, authorize('FINANCE_OFFICER'), revenueController.verifyRevenue);

module.exports = router;
