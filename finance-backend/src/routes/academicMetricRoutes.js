const express = require('express');
const router = express.Router();
const academicMetricController = require('../controllers/academicMetricController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', academicMetricController.getMetrics);
router.get('/all', authorize('ADMIN'), academicMetricController.getAllMetrics);
router.get('/pending', authorize('ADMIN'), academicMetricController.getPendingMetrics);
router.post('/', authorize('FACULTY', 'ADMIN'), academicMetricController.updateMetrics);
router.put('/:id/approve', authorize('ADMIN'), academicMetricController.approveMetrics);
router.put('/:id/reject', authorize('ADMIN'), academicMetricController.rejectMetrics);

module.exports = router;
