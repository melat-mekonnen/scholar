const ALLOWED_DEGREES = ["high_school", "bachelor", "master", "phd"];

function optionalTrimmedString(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function normalizeGpa(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) {
    const err = new Error("GPA must be a valid number when provided");
    err.statusCode = 400;
    throw err;
  }
  if (n < 0.0 || n > 4.0) {
    const err = new Error("GPA must be between 0.0 and 4.0");
    err.statusCode = 400;
    throw err;
  }
  return n;
}

function normalizeDegreeLevel(v) {
  if (v == null || v === "") return null;
  if (!ALLOWED_DEGREES.includes(v)) {
    const err = new Error(
      "Degree level must be one of: high_school, bachelor, master, phd"
    );
    err.statusCode = 400;
    throw err;
  }
  return v;
}

function normalizeInterests(interests) {
  if (interests == null) return [];
  if (!Array.isArray(interests)) {
    const err = new Error("Interests must be an array");
    err.statusCode = 400;
    throw err;
  }
  if (interests.length > 10) {
    const err = new Error("Interests cannot have more than 10 items");
    err.statusCode = 400;
    throw err;
  }
  return interests;
}

function calculateProfileCompleteness(profile) {
  let score = 0;
  // Based on 8 factors
  if (profile.gpa != null) score += 10;
  if (profile.degreeLevel) score += 15;
  if (profile.fieldOfStudy) score += 15;
  if (Array.isArray(profile.interests) && profile.interests.length > 0) score += 15;
  if (profile.preferredCountry) score += 10;
  if (profile.preferredFundingType) score += 10;
  if (profile.preferredScholarshipType) score += 10;
  if (profile.goals) score += 15;

  return Math.min(score, 100);
}

/**
 * All core fields are optional — students may save partial profiles anytime.
 * Values that are present are validated; empty / null clears optional fields.
 */
function validateProfileInput(input) {
  const fieldOfStudy = optionalTrimmedString(input.fieldOfStudy);
  const gpa = normalizeGpa(input.gpa);
  const degreeLevel = normalizeDegreeLevel(input.degreeLevel);
  const preferredCountry = optionalTrimmedString(input.preferredCountry);
  const interests = normalizeInterests(input.interests);
  const financialNeed = Boolean(input.financialNeed);
  const preferredFundingType = optionalTrimmedString(input.preferredFundingType);
  const languageProficiency = Array.isArray(input.languageProficiency) ? input.languageProficiency : [];
  const preferredScholarshipType = optionalTrimmedString(input.preferredScholarshipType);
  const goals = optionalTrimmedString(input.goals);

  return {
    fieldOfStudy,
    gpa,
    degreeLevel,
    preferredCountry,
    interests,
    financialNeed,
    preferredFundingType,
    languageProficiency,
    preferredScholarshipType,
    goals,
  };
}

module.exports = {
  calculateProfileCompleteness,
  validateProfileInput,
};
