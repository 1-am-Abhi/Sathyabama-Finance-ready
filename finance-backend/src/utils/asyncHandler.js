const logger = require('./logger');

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    logger.error("[CRITICAL API ERROR]", err);

    // If headers already sent, don't try to send again
    if (res.headersSent) {
      return;
    }

    // Always return 200 with success: false as per user requirement
    // This prevents 500 errors from crashing the UI/pipeline
    return res.status(200).json({
      success: false,
      message: err.message || "Internal error",
      data: []
    });
  }
};

module.exports = asyncHandler;
