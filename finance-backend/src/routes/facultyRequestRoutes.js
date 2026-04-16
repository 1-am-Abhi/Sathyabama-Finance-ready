const express = require('express');
const router = express.Router();
const facultyRequestController = require('../controllers/facultyRequestController');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Base route /api

// 1. Faculty Routes
router.post('/faculty/request', protect, authorize('FACULTY'), upload.fields([{ name: 'bill', maxCount: 1 }, { name: 'proposal', maxCount: 1 }]), facultyRequestController.createRequest);

// 2. Admin Routes
router.get('/admin/requests', protect, authorize('ADMIN'), facultyRequestController.getAdminRequests);
router.patch('/admin/requests/:id/approve', protect, authorize('ADMIN'), facultyRequestController.approveAdminRequest);
router.patch('/admin/requests/:id/reject', protect, authorize('ADMIN'), facultyRequestController.rejectAdminRequest);

// 3. Finance Routes
router.get('/finance/requests', protect, authorize('FINANCE_OFFICER'), facultyRequestController.getFinanceRequests);
router.patch('/finance/requests/:id/disburse', protect, authorize('FINANCE_OFFICER'), facultyRequestController.disburseFinanceRequest);

module.exports = router;
