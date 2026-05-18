/** Roles allowed to save/unsave bookmarks (student UX; admin included for dev/testing). */
const BOOKMARK_ROLES = new Set(["student", "admin"]);

function getBookmarkUserId(req) {
  if (!req.user || !BOOKMARK_ROLES.has(req.user.role)) return undefined;
  return req.user.id;
}

function requireStudent(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  if (!BOOKMARK_ROLES.has(req.user.role)) {
    return res.status(403).json({ message: "Student access required" });
  }
  return next();
}

module.exports = { requireStudent, getBookmarkUserId };
