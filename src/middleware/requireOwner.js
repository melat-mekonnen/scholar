/** Platform business owner — org-level governance (not public signup). */
function requireOwner(req, res, next) {
  if (!req.user || req.user.role !== "owner") {
    return res.status(403).json({ message: "Owner access required" });
  }
  return next();
}

module.exports = { requireOwner };
