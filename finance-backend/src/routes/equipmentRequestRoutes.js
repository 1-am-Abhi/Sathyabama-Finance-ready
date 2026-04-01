const express = require('express');
const { createEquipmentRequest, getEquipmentRequests, updateEquipmentStatus } = require('../controllers/equipmentRequestController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/', authorize('FACULTY'), createEquipmentRequest);
router.get('/', getEquipmentRequests);
router.put('/:id/status', updateEquipmentStatus);

module.exports = router;
