const express = require('express');
const { createODRequest, getODRequests, updateODRequestStatus } = require('../controllers/odRequestController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('FACULTY', 'ADMIN'), createODRequest);
router.get('/', authorize('FACULTY', 'ADMIN'), getODRequests);
router.put('/:id/status', authorize('ADMIN'), updateODRequestStatus);

module.exports = router;
