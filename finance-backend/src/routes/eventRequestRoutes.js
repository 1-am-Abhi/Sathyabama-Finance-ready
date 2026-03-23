const express = require('express');
const { createEventRequest, getEventRequests, updateEventRequestStatus } = require('../controllers/eventRequestController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('FACULTY'), createEventRequest);
router.get('/', getEventRequests);
router.put('/:id/status', updateEventRequestStatus);

module.exports = router;
