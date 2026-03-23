const express = require('express');
const { createODRequest, getODRequests, updateODRequestStatus } = require('../controllers/odRequestController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('FACULTY'), createODRequest);
router.get('/', getODRequests);
router.put('/:id/status', updateODRequestStatus);

module.exports = router;
