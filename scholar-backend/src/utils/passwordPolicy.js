const MIN_LENGTH = 8;

function validatePassword(password) {
  const p = String(password || "");
  const errors = [];

  if (p.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters`);
  }
  if (!/\d/.test(p)) {
    errors.push("Password must include at least one number");
  }
  if (!/[^A-Za-z0-9]/.test(p)) {
    errors.push("Password must include at least one symbol");
  }

  if (errors.length) {
    const err = new Error(errors[0]);
    err.statusCode = 400;
    err.details = errors;
    throw err;
  }
}

function getPasswordStrength(password) {
  const p = String(password || "");
  let score = 0;
  if (p.length >= MIN_LENGTH) score++;
  if (p.length >= 12) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;

  if (score <= 2) return "weak";
  if (score <= 4) return "fair";
  return "strong";
}

module.exports = { validatePassword, getPasswordStrength, MIN_LENGTH };
