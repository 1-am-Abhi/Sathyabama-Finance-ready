const express = require('express');
const { createEventRequest, getEventRequests, updateEventRequestStatus } = require('../controllers/eventRequestController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('FACULTY', 'ADMIN'), createEventRequest);
router.get('/', authorize('FACULTY', 'ADMIN'), getEventRequests);
router.put('/:id/status', authorize('ADMIN'), updateEventRequestStatus);

module.exports = router;
