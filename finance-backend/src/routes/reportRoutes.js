const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/v1/reports/export
 * @desc    Generate financial reports (PDF/Excel)
 * @access  Private (Admin/Finance)
 */
router.get('/export', protect, authorize('ADMIN', 'FINANCE_OFFICER'), reportController.exportReport);

module.exports = router;
