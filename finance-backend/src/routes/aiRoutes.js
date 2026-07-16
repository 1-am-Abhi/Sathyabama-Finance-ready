const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect } = require('../middleware/authMiddleware');
const aiController = require('../controllers/aiController');

// AI calls hit a paid upstream (Anthropic) — cap per-user usage tightly.
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { success: false, message: 'Too many AI requests — please slow down.' },
});

// All AI endpoints require an authenticated user.
router.post('/proposal', protect, aiLimiter, aiController.proposal);
router.post('/analyze', protect, aiLimiter, aiController.analyze);

module.exports = router;
