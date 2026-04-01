const express = require('express');
const { createNotification, getNotifications, markAsRead } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', createNotification);
router.get('/', getNotifications);
router.put('/:id/read', markAsRead);

module.exports = router;
