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

  const normalizedEmail = String(email).toLowerCase();
  console.log(`[@auth] loginUser email received: ${normalizedEmail}`);

  const user = await userRepo.findByEmail(normalizedEmail);
  console.log("[@auth] loginUser user found:", !!user, user ? { email: user.email, role: user.role } : null);
  if (!user || !user.password_hash) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  console.log(`[@auth] loginUser password match: ${match}`);
  if (!match) {
    throw Object.assign(new Error("Invalid credentials"), { statusCode: 401 });
  }

  console.log(`[@auth] loginUser returning role: ${user.role}`);
  return user;
}

module.exports = { loginUser };

