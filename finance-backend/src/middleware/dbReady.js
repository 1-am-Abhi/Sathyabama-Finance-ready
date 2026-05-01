module.exports = (req, res, next) => {
  if (!global.dbReady) {
    return res.status(503).json({
      success: false,
      message: 'Database reconnecting, please retry'
    });
  }

  next();
};
