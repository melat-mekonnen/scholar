const { UserRepository } = require("../../repositories/UserRepository");

const userRepo = new UserRepository();

function ensureAdminUser(user) {
  if (!user || user.role !== "admin") {
    const err = new Error("Admin access required");
    err.statusCode = 403;
    throw err;
  }
}

function validateRole(role) {
  const allowed = ["student", "admin"];
  if (!allowed.includes(role)) {
    const err = new Error("Invalid role");
    err.statusCode = 400;
    throw err;
  }
}

async function listUsers(currentUser, { page, pageSize, search, role }) {
  ensureAdminUser(currentUser);
  const parsedPage = page ? parseInt(page, 10) : 1;
  const parsedSize = pageSize ? parseInt(pageSize, 10) : 20;
  return userRepo.listUsers({
    page: parsedPage,
    pageSize: parsedSize,
    search,
    role,
  });
}

async function getUserById(currentUser, id) {
  ensureAdminUser(currentUser);
  const user = await userRepo.findById(id);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return user;
}

async function updateUserById(currentUser, id, payload) {
  ensureAdminUser(currentUser);
  const { fullName, email } = payload;
  const updated = await userRepo.updateUser(id, { fullName, email });
  if (!updated) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return updated;
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
  return updated;
}

async function updateUserRole(currentUser, id, role) {
  ensureAdminUser(currentUser);
  validateRole(role);
  const updated = await userRepo.updateRole(id, role);
  if (!updated) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return updated;
}

module.exports = {
  listUsers,
  getUserById,
  updateUserById,
  deleteUserById,
  setUserActivation,
  updateUserRole,
};

