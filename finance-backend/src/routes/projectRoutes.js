const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { protect, authorize, authorizeRoles } = require('../middleware/authMiddleware');

router.use(protect); // All project routes are protected

router.get('/', projectController.getProjects);
router.get('/stats', authorize('ADMIN'), projectController.getAdminStats);
router.get('/faculty-stats', projectController.getFacultyStats);
router.get('/:id', projectController.getProject);

// Only Admin and Faculty can create/update projects
router.post('/', authorizeRoles('faculty', 'admin'), projectController.createProject);
router.put('/:id', authorizeRoles('faculty', 'admin'), projectController.updateProject);
router.delete('/:id', authorize('ADMIN'), projectController.deleteProject);

// Team management
router.get('/:id/members', projectController.getProjectMembers);
router.put('/:id/members', authorize('ADMIN'), projectController.updateProjectMembers);

module.exports = router;
