const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const projectController = require('../controllers/projectController');
const fundRequestController = require('../controllers/fundRequestController');

// All finance routes require authentication
router.use(protect);

// Helper for safe fallbacks
const safeFallback = (req, res) => {
    res.json({ success: true, data: [], meta: {} });
};

// Mapped Routes
router.get('/stats', projectController.getProjectStats);
router.get('/projects', projectController.getAllProjects);
router.get('/disbursements', fundRequestController.getFundRequests); 

// Placeholder Fallbacks to prevent 404s
router.get('/fund-sources/overview', safeFallback);
router.get('/departments', safeFallback);
router.get('/disbursal-history', safeFallback);
router.get('/pfms', safeFallback);
router.get('/fund-flow', safeFallback);
router.get('/reports-data', safeFallback);

module.exports = router;
