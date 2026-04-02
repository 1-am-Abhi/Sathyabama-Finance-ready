const express = require('express');
const { createODRequest, getODRequests, updateODRequestStatus } = require('../controllers/odRequestController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, odRequestSchema } = require('../utils/validation');

const router = express.Router();

router.use(protect);

router.post('/', authorize('FACULTY', 'ADMIN'), validate(odRequestSchema), createODRequest);
router.get('/', authorize('FACULTY', 'ADMIN'), getODRequests);
router.put('/:id/status', authorize('FACULTY', 'ADMIN'), updateODRequestStatus);

module.exports = router;
