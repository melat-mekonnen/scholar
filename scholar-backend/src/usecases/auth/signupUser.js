const bcrypt = require("bcryptjs");
const { UserRepository } = require("../../repositories/UserRepository");

const userRepo = new UserRepository();

function validateSignupInput({ fullName, email, password }) {
  if (!fullName || fullName.trim().length < 2) {
    throw Object.assign(new Error("Full name is required"), { statusCode: 400 });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw Object.assign(new Error("Valid email is required"), { statusCode: 400 });
  }
  if (!password || password.length < 8) {
    throw Object.assign(
      new Error("Password must be at least 8 characters"),
      { statusCode: 400 }
    );
  }
}

async function signupUser({ fullName, email, password }) {
  validateSignupInput({ fullName, email, password });

  const existing = await userRepo.findByEmail(email.toLowerCase());
  if (existing) {
    throw Object.assign(new Error("Email is already registered"), {
      statusCode: 409,
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const created = await userRepo.createLocalUser({
    fullName,
    email,
    passwordHash,
  });

  return created;
}

module.exports = { signupUser };

