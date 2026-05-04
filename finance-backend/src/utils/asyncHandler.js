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

    const statusCode = err.statusCode || err.status || 500;
    return res.status(statusCode).json({
      success: false,
      message: statusCode >= 500 ? "Internal server error" : (err.message || "Request failed"),
      data: []
    });
  }
};

module.exports = asyncHandler;
