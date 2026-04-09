const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const { validate, notificationSchema } = require('../utils/validation');

router.post('/', protect, validate(notificationSchema), notificationController.createNotification);
router.get('/', protect, notificationController.getNotifications);
router.patch('/read/:id', protect, notificationController.markAsRead);
router.patch('/read-all', protect, notificationController.markAllAsRead);

module.exports = router;
