/**
 * Allows admin, the user matching :id (self), or owner (use case restricts owner to student/manager targets).
 */
function allowAdminSelfOrOwner(paramName = "id") {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    const targetId = req.params[paramName];
    if (!targetId) {
      return res.status(400).json({ message: "Missing user id" });
    }
    if (req.user.role === "admin") {
      return next();
    }
    if (String(req.user.id) === String(targetId)) {
      return next();
    }
    if (req.user.role === "owner") {
      return next();
    }
    return res.status(403).json({ message: "Forbidden" });
  };
}

module.exports = { allowAdminSelfOrOwner };
