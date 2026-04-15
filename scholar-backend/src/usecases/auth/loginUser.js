const bcrypt = require("bcryptjs");
const { UserRepository } = require("../../repositories/UserRepository");

const userRepo = new UserRepository();

function validateLoginInput({ email, password }) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error("Valid email is required"), { statusCode: 400 });
  }
  if (!password) {
    throw Object.assign(new Error("Password is required"), { statusCode: 400 });
  }
}

async function loginUser({ email, password }) {
  validateLoginInput({ email, password });

  const user = await userRepo.findByEmail(email.toLowerCase());
  if (!user || !user.password_hash) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }

  return user;
}

module.exports = { loginUser };

