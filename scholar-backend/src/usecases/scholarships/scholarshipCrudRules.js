function isManager(role) {
  return role === "manager";
}

function isOwnerOrAdmin(role) {
  return role === "owner" || role === "admin";
}

function initialStatusForCreator(role) {
  return isOwnerOrAdmin(role) ? "verified" : "pending";
}

function nextStatusAfterUpdate(role) {
  return isOwnerOrAdmin(role) ? "verified" : "pending";
}

function assertCanMutateScholarship(actor, scholarship) {
  if (!actor) {
    const err = new Error("Authentication required");
    err.statusCode = 401;
    throw err;
  }
  if (isOwnerOrAdmin(actor.role)) return;
  if (isManager(actor.role) && String(scholarship.posted_by_user_id) === String(actor.id)) return;
  const err = new Error("Forbidden");
  err.statusCode = 403;
  throw err;
}

function parseDeadline(value, { required = false } = {}) {
  if (value == null || value === "") {
    if (!required) return null;
    const err = new Error("Deadline is required");
    err.statusCode = 400;
    throw err;
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    const err = new Error("Deadline must be a valid date");
    err.statusCode = 400;
    throw err;
  }
  const iso = dt.toISOString().slice(0, 10);
  if (iso < new Date().toISOString().slice(0, 10)) {
    const err = new Error("Deadline must be today or in the future");
    err.statusCode = 400;
    throw err;
  }
  return iso;
}

module.exports = {
  initialStatusForCreator,
  nextStatusAfterUpdate,
  assertCanMutateScholarship,
  parseDeadline,
};
