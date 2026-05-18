function requireAdminOrManager(req, res, next) {
  const role = req.user?.role;
  if (role !== "admin" && role !== "manager") {
    return res.status(403).json({ message: "Admin or manager access required" });
  }
  return next();
}

module.exports = { requireAdminOrManager };
