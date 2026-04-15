function requireManager(req, res, next) {
  if (!req.user || req.user.role !== "manager") {
    return res.status(403).json({ message: "Manager access required" });
  }
  return next();
}

module.exports = { requireManager };

