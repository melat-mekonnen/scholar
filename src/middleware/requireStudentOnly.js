function requireStudentOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Student access required" });
  }
  return next();
}

module.exports = { requireStudentOnly };
