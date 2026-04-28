const express = require('express');
const router = express.Router();
const fundRequestController = require('../controllers/fundRequestController');
const { protect, authorize } = require('../middleware/authMiddleware');
const { validate, fundRequestSchema } = require('../utils/validation');
const { sanitizeFinancialInput } = require('../middleware/inputSanitizer');
const { upload } = require('../middleware/uploadMiddleware');
const auditController = require('../controllers/auditController');

// All routes require authentication
router.use(protect);

// ── Read ─────────────────────────────────────────────────────────────────────
router.get('/', fundRequestController.getFundRequests);

/**
 * GET /fund-requests/project/:projectId
 * Returns project budget summary (totalAmount, disbursedAmount, remainingAmount)
 * plus all installment fund requests for that project.
 * Faculty see only their own; Admin/Finance see all.
 */
router.get('/project/:projectId', fundRequestController.getProjectWithInstallments);
router.get('/project/:projectId/installments', fundRequestController.getProjectWithInstallments);

router.get('/:id', fundRequestController.getFundRequest);
router.get('/:requestId/audit', auditController.getAuditTimeline);

// ── Create (Faculty only) ─────────────────────────────────────────────────────
router.post(
    '/',
    authorize('FACULTY'),
    upload.single('bill'),
    sanitizeFinancialInput,
    validate(fundRequestSchema),
    fundRequestController.createFundRequest
);

// ── Update (Faculty only — documents / stage field) ───────────────────────────
router.put('/:id', authorize('FACULTY'), fundRequestController.updateFundRequest);

// ── Admin: Approve / Reject ───────────────────────────────────────────────────
// Support both PUT (legacy) and PATCH (REST-idiomatic) verbs
router.put('/:id/approve',    authorize('ADMIN'), fundRequestController.approveFundRequest);
router.patch('/:id/approve',  authorize('ADMIN'), fundRequestController.approveFundRequest);

router.put('/:id/reject',     authorize('ADMIN'), fundRequestController.rejectFundRequest);
router.patch('/:id/reject',   authorize('ADMIN'), fundRequestController.rejectFundRequest);

// ── Finance: Disburse ─────────────────────────────────────────────────────────
/**
 * PATCH /fund-requests/:id/disburse
 * Finance Officer disburses an Admin-approved request.
 * Updates: FundRequest status → DISBURSED, Project.releasedBudget += amount,
 *          creates Disbursement record + Ledger OUTFLOW entry.
 * Notifies: Faculty
 */
router.patch('/:id/disburse', authorize('FINANCE_OFFICER'), sanitizeFinancialInput, fundRequestController.disburseFund);
router.post('/:id/disburse', authorize('ADMIN', 'FINANCE_OFFICER'), sanitizeFinancialInput, fundRequestController.disburseFund);

// ── Granular pipeline advancement (Finance / Faculty) ─────────────────────────
// Retained for backward-compat with the stage-based pipeline UI
router.post('/:id/advance', sanitizeFinancialInput, fundRequestController.advanceStage);

module.exports = router;
