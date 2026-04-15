const { UserRepository } = require("../../repositories/UserRepository");
const { getGoogleUserProfile } = require("../../infra/google/googleOAuthClient");

const userRepo = new UserRepository();

async function handleGoogleCallback(code) {
  if (!code) {
    throw Object.assign(new Error("Missing authorization code"), {
      statusCode: 400,
    });
  }

  const profile = await getGoogleUserProfile(code);

  if (!profile.email) {
    throw Object.assign(new Error("Google account has no email"), {
      statusCode: 400,
    });
  }

  const googleId = String(profile.googleId || "");
  const email = String(profile.email || "").toLowerCase();
  const fullName = String(profile.fullName || "").trim() || "Google User";

  // 1) If this google_id already exists, update profile fields.
  const existingByGoogleId = await userRepo.findByGoogleId(googleId);
  if (existingByGoogleId) {
    const updated = await userRepo.updateGoogleUserByGoogleId({
      googleId,
      fullName,
      email,
    });
    return updated || existingByGoogleId;
  }

  // 2) If the email already exists (maybe from a different google_id or local signup),
  // attach the new google_id to the existing row.
  const existingByEmail = await userRepo.findByEmail(email);
  if (existingByEmail) {
    const updated = await userRepo.updateGoogleUserByEmail({
      googleId,
      fullName,
      email,
    });
    return updated || existingByEmail;
  }

  // 3) Otherwise create a new google user.
  return userRepo.upsertGoogleUser({
    googleId,
    fullName,
    email,
  });
}

module.exports = { handleGoogleCallback };

