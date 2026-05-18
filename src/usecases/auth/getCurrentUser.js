const { UserRepository } = require("../../repositories/UserRepository");

const userRepo = new UserRepository();

async function getCurrentUser(userId) {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw Object.assign(new Error("User not found"), { statusCode: 404 });
  }
  return user;
}

module.exports = { getCurrentUser };

