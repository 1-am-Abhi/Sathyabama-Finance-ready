const logger = require('./logger');

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (err) {
    logger.error("API_CONTROLLER_ERROR", {
      message: err.message,
      stack: err.stack,
      method: req.method,
      path: req.originalUrl,
      userId: req.user?.id || req.user?._id || null,
      role: req.user?.role || null,
      params: req.params,
      query: req.query
    });

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
