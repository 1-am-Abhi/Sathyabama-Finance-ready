const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { protect } = require('../middleware/authMiddleware');

router.put('/update', protect, profileController.updateProfile);
router.post('/sync-scopus', protect, profileController.syncScopus);

module.exports = router;
