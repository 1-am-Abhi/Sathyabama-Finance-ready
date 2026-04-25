const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/authMiddleware');
const facultyController = require('../controllers/facultyController');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// PHASE 3, 4, 5: Preview, Validate, AI Clean, Duplicate Detection
router.post('/preview', protect, authorize('ADMIN'), upload.single('file'), facultyController.previewFaculties);

// PHASE 6: Final Upload
router.post('/upload-final', protect, authorize('ADMIN'), facultyController.uploadFacultiesFinal);

module.exports = router;
