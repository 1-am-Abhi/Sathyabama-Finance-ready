const express = require('express');
const router = express.Router();
const internshipController = require('../controllers/internshipController');
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All admin routes require authentication and ADMIN role
router.use(protect);
router.use(authorize('ADMIN'));

// User Management & Cleanup
router.delete('/cleanup-users', authController.cleanupUsers);

// Internship Approvals (commonly used by the Admin UI)
router.get('/internships', internshipController.getAdminInternships);
router.put('/internships/:id/approve', internshipController.approveInternship);

module.exports = router;
