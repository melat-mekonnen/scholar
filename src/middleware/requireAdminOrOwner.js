function requireAdminOrOwner(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role === "admin" || req.user.role === "owner") {
    return next();
  }
  return res.status(403).json({ message: "Admin or owner access required" });
}

module.exports = { requireAdminOrOwner };
