const express = require('express');
const router = express.Router();
const fundRequestController = require('../controllers/fundRequestController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, fundRequestSchema } = require('../utils/validation');

router.use(protect); // All routes protected

router.get('/', fundRequestController.getFundRequests);
router.get('/:id', fundRequestController.getFundRequest);

// Only FACULTY can submit requests
router.post('/', authorize('FACULTY'), validate(fundRequestSchema), fundRequestController.createFundRequest);

// Update a fund request
router.put('/:id', authorize('FACULTY'), fundRequestController.updateFundRequest);

// Only ADMIN can approve/reject initial request
router.put('/:id/approve', authorize('ADMIN'), fundRequestController.approveFundRequest);
router.put('/:id/reject', authorize('ADMIN'), fundRequestController.rejectFundRequest);

// Finance or Faculty can advance appropriate stages (sequentially enforced in controller)
router.post('/:id/advance', fundRequestController.advanceStage);

module.exports = router;
