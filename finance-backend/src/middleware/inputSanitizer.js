/**
 * Native sanitization to avoid external dependency issues (xss package missing in package.json)
 */
const simpleSanitize = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/<[^>]*>?/gm, '') // Remove HTML tags
        .replace(/[&<>"']/g, '')   // Remove sensitive characters
        .trim();
};

/**
 * Security Middleware: Financial Input Sanitizer & Validator
 */
const sanitizeFinancialInput = (req, res, next) => {
    const { amount, requestedAmount, remarks, purpose } = req.body;

    // 1. Validate Amount (if present)
    if (amount !== undefined) {
        const val = Number(amount);
        if (isNaN(val) || val <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Security violation: Disbursement amount must be a positive number." 
            });
        }
        req.body.amount = val;
    }

    if (requestedAmount !== undefined) {
        const val = Number(requestedAmount);
        if (isNaN(val) || val <= 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Security violation: Requested amount must be a positive number." 
            });
        }
        req.body.requestedAmount = val;
    }

    // 2. Sanitize Strings (Against XSS/Injection)
    if (remarks) req.body.remarks = simpleSanitize(remarks);
    if (purpose) req.body.purpose = simpleSanitize(purpose);

    next();
};

module.exports = {
    sanitizeFinancialInput
};
