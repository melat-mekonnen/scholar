/** Manager operational tools; owners use the same routes for scholarship operations. */
function requireManager(req, res, next) {
  if (
    !req.user ||
    (req.user.role !== "manager" && req.user.role !== "owner")
  ) {
    return res.status(403).json({ message: "Manager or owner access required" });
  }
  return next();
}

module.exports = { requireManager };

