const { UserRepository } = require("../../repositories/UserRepository");

const userRepo = new UserRepository();

const SELF_UPDATE_BLOCKED_KEYS = new Set([
  "role",
  "isActive",
  "is_active",
  "password",
  "passwordHash",
  "password_hash",
]);

function ensureAdminUser(user) {
  if (!user || user.role !== "admin") {
    const err = new Error("Admin access required");
    err.statusCode = 403;
    throw err;
  }
}

function assertValidEmail(email) {
  if (email == null || email === "") return;
  const s = String(email).trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) {
    const err = new Error("Invalid email format");
    err.statusCode = 400;
    throw err;
  }
}

function ensureCanAccessUserRecord(actor, targetRow) {
  if (actor.role === "admin") return;
  if (String(actor.id) === String(targetRow.id)) return;
  if (
    actor.role === "owner" &&
    (targetRow.role === "student" || targetRow.role === "manager")
  ) {
    return;
  }
  const err = new Error("Forbidden");
  err.statusCode = 403;
  throw err;
}

function formatUserRow(row) {
  if (!row) return null;
  const out = {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
  };
  if (row.google_id != null) out.googleId = row.google_id;
  if (row.auth_provider) out.authProvider = row.auth_provider;
  if (row.created_at) out.createdAt = row.created_at;
  return out;
}

function validateRole(role) {
  const allowed = ["student", "admin", "manager", "owner"];
  if (!allowed.includes(role)) {
    const err = new Error("Invalid role");
    err.statusCode = 400;
    throw err;
  }
}

async function listUsers(currentUser, { page, pageSize, search, role }) {
  const parsedPage = page ? parseInt(page, 10) : 1;
  const parsedSize = pageSize ? parseInt(pageSize, 10) : 20;

  if (currentUser.role === "admin") {
    const result = await userRepo.listUsers({
      page: parsedPage,
      pageSize: parsedSize,
      search,
      role,
    });
    return {
      ...result,
      users: result.users.map(formatUserRow),
    };
  }

  if (currentUser.role === "owner") {
    let rolesFilter;
    if (role) {
      if (role !== "student" && role !== "manager") {
        const err = new Error("Owner may only filter by student or manager role");
        err.statusCode = 403;
        throw err;
      }
      rolesFilter = [role];
    } else {
      rolesFilter = ["student", "manager"];
    }
    const result = await userRepo.listUsers({
      page: parsedPage,
      pageSize: parsedSize,
      search,
      roles: rolesFilter,
    });
    return {
      ...result,
      users: result.users.map(formatUserRow),
    };
  }

  const err = new Error("Forbidden");
  err.statusCode = 403;
  throw err;
}

async function getUserById(currentUser, id) {
  const user = await userRepo.findById(id);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  ensureCanAccessUserRecord(currentUser, user);
  return formatUserRow(user);
}

async function updateUserById(currentUser, id, payload = {}) {
  const target = await userRepo.findById(id);
  if (!target) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const isAdmin = currentUser.role === "admin";
  const isSelf = String(currentUser.id) === String(id);

  if (!isAdmin) {
    for (const k of Object.keys(payload)) {
      if (SELF_UPDATE_BLOCKED_KEYS.has(k)) {
        const err = new Error("You cannot update that field");
        err.statusCode = 403;
        throw err;
      }
    }
  }

  if (isAdmin) {
    // ok
  } else if (isSelf) {
    // ok
  } else if (
    currentUser.role === "owner" &&
    (target.role === "student" || target.role === "manager")
  ) {
    // ok — owner may edit name/email for operational users
  } else {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    throw err;
  }

  const fullName = payload.fullName ?? payload.full_name;
  const email = payload.email;
  if (email != null) {
    assertValidEmail(email);
  }

  const updated = await userRepo.updateUser(id, { fullName, email });
  if (!updated) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return formatUserRow(updated);
}

async function deleteUserById(currentUser, id) {
  ensureAdminUser(currentUser);
  await userRepo.deleteUser(id);
}

async function setUserActivation(currentUser, id, isActive) {
  ensureAdminUser(currentUser);
  const updated = await userRepo.setActive(id, isActive);
  if (!updated) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return formatUserRow(updated);
}

async function updateUserRole(currentUser, targetId, role) {
  validateRole(role);
  const target = await userRepo.findById(targetId);
  if (!target) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (currentUser.role === "admin") {
    const updated = await userRepo.updateRole(targetId, role);
    return formatUserRow(updated);
  }

  if (currentUser.role === "owner") {
    if (String(currentUser.id) === String(targetId)) {
      const err = new Error("Owners cannot change their own role via this endpoint");
      err.statusCode = 403;
      throw err;
    }
    if (target.role === "admin" || target.role === "owner") {
      const err = new Error("Owner cannot change roles for admin or owner accounts");
      err.statusCode = 403;
      throw err;
    }
    if (role !== "student" && role !== "manager") {
      const err = new Error("Owner may only assign student or manager roles");
      err.statusCode = 403;
      throw err;
    }
    const updated = await userRepo.updateRole(targetId, role);
    return formatUserRow(updated);
  }

  const err = new Error("Admin or owner access required");
  err.statusCode = 403;
  throw err;
}

module.exports = {
  listUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  setUserActivation,
  updateUserRole,
};
