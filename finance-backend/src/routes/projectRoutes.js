const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { protect, authorize, authorizeRoles } = require('../middleware/authMiddleware');

router.use(protect); // All project routes are protected

router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProject);

// Only Admin and Faculty can create/update projects
router.get('/stats', authorize('ADMIN'), projectController.getAdminStats);
router.post('/', authorizeRoles('faculty', 'admin'), projectController.createProject);
router.put('/:id', authorizeRoles('faculty', 'admin'), projectController.updateProject);
router.delete('/:id', authorize('ADMIN'), projectController.deleteProject);

module.exports = router;
