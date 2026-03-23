const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect); // All project routes are protected

router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProject);

// Only ADMIN can create/update/delete projects
router.post('/', authorize('ADMIN'), projectController.createProject);
router.put('/:id', authorize('ADMIN'), projectController.updateProject);
router.delete('/:id', authorize('ADMIN'), projectController.deleteProject);

module.exports = router;
