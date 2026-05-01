const express = require('express');
const { createEventRequest, getEventRequests, updateEventRequestStatus, updateEventMembers } = require('../controllers/eventRequestController');
const { protect, authorize } = require('../middleware/authMiddleware');
const orgScope = require('../middleware/orgScope');

const router = express.Router();

router.use(protect);
router.use(orgScope);

router.post('/', authorize('FACULTY', 'ADMIN'), createEventRequest);
router.get('/', authorize('FACULTY', 'ADMIN'), getEventRequests);
router.put('/:id/status', authorize('ADMIN'), updateEventRequestStatus);
router.put('/:id/members', authorize('ADMIN'), updateEventMembers);

module.exports = router;
