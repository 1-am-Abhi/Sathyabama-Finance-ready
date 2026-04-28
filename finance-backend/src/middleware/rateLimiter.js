const rateLimit = require('express-rate-limit');

/**
 * Sensitive Finance Operations Rate Limiter
 * Limits critical financial actions to prevent brute-force or abuse.
 */
const financeRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 requests per window
    message: {
        success: false,
        message: 'Too many financial operations from this IP. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Report Generation Rate Limiter
 */
const reportRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // 20 reports per hour
    message: {
        success: false,
        message: 'Report generation limit reached. Please wait an hour.'
    }
});

module.exports = { financeRateLimiter, reportRateLimiter };
