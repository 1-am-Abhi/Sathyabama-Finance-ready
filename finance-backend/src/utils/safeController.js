const logger = require('./logger');

const safeController = (fn) => async (req, res) => {
  try {
    const result = await fn(req, res);

    if (!res.headersSent) {
      res.json({
        success: true,
        data: result || []
      });
    }

  } catch (err) {
    logger.error("API ERROR:", err);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: err.message,
        data: []
      });
    }
  }
};

module.exports = safeController;
