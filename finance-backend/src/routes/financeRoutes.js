const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All finance routes require being a FINANCE_OFFICER or ADMIN
router.use(protect);
router.use(authorize('FINANCE_OFFICER', 'ADMIN'));

router.get('/stats', financeController.getFinanceStats);
router.get('/fund-flow', financeController.getFundFlowProjects);

router.post('/pfms', financeController.createPFMSTransaction);
router.get('/pfms', financeController.getPFMSTransactions);

router.get('/internship-fees', financeController.getInternshipFees);
router.put('/internship-fees/:id', financeController.verifyInternshipFee);

module.exports = router;
