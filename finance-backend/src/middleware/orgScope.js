module.exports = (req, res, next) => {
  if (!req.user || !req.user.organizationId) {
    return res.status(401).json({
      success: false,
      message: "Invalid organization context"
    });
  }
  
  req.organizationId = req.user.organizationId || null;
  next();
};
