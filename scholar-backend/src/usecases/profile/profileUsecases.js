const { StudentProfileRepository } = require("../../repositories/StudentProfileRepository");
const {
  calculateProfileCompleteness,
  validateProfileInput,
} = require("./profileCompleteness");

const repo = new StudentProfileRepository();

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function mergeOptionalTrimmed(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function mergeOptionalGpa(v) {
  if (v == null || v === "") return null;
  return v;
}

function mergeProfileUpdate(existing, input) {
  return {
    fieldOfStudy: hasOwn(input, "fieldOfStudy")
      ? mergeOptionalTrimmed(input.fieldOfStudy)
      : existing.field_of_study ?? null,
    gpa: hasOwn(input, "gpa") ? mergeOptionalGpa(input.gpa) : existing.gpa,
    degreeLevel: hasOwn(input, "degreeLevel")
      ? input.degreeLevel === null || input.degreeLevel === ""
        ? null
        : input.degreeLevel
      : existing.degree_level,
    preferredCountry: hasOwn(input, "preferredCountry")
      ? mergeOptionalTrimmed(input.preferredCountry)
      : existing.preferred_country ?? null,
    interests: hasOwn(input, "interests")
      ? input.interests
      : existing.interests,
    financialNeed: hasOwn(input, "financialNeed")
      ? input.financialNeed
      : existing.financial_need ?? false,
    preferredFundingType: hasOwn(input, "preferredFundingType")
      ? mergeOptionalTrimmed(input.preferredFundingType)
      : existing.preferred_funding_type ?? null,
    languageProficiency: hasOwn(input, "languageProficiency")
      ? input.languageProficiency
      : existing.language_proficiency ?? [],
    preferredScholarshipType: hasOwn(input, "preferredScholarshipType")
      ? mergeOptionalTrimmed(input.preferredScholarshipType)
      : existing.preferred_scholarship_type ?? null,
    goals: hasOwn(input, "goals")
      ? mergeOptionalTrimmed(input.goals)
      : existing.goals ?? null,
  };
}

async function createProfile(userId, input) {
  const validated = validateProfileInput(input || {});
  const completenessScore = calculateProfileCompleteness(validated);
  const profile = await repo.createProfile(userId, {
    ...validated,
    completenessScore,
  });
  return profile;
}

async function getProfile(userId) {
  const existing = await repo.findByUserId(userId);
  if (!existing) {
    return null;
  }
  return existing;
}

async function updateProfile(userId, input) {
  const existing = await repo.findByUserId(userId);
  if (!existing) {
    const err = new Error("Profile not found");
    err.statusCode = 404;
    throw err;
  }

  const mergedRaw = mergeProfileUpdate(existing, input || {});
  const validated = validateProfileInput(mergedRaw);
  const completenessScore = calculateProfileCompleteness(validated);
  const updated = await repo.updateProfile(userId, {
    ...validated,
    completenessScore,
  });
  return updated;
}

module.exports = {
  createProfile,
  getProfile,
  updateProfile,
};
