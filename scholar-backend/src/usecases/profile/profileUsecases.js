const { StudentProfileRepository } = require("../../repositories/StudentProfileRepository");
const {
  calculateProfileCompleteness,
  validateProfileInput,
} = require("./profileCompleteness");

const repo = new StudentProfileRepository();

async function createProfile(userId, input) {
  const validated = validateProfileInput(input);
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
  // Support partial updates:
  // - Load existing profile
  // - Merge incoming fields
  // - Validate the final shape using the same rules as create
  const existing = await repo.findByUserId(userId);
  if (!existing) {
    const err = new Error("Profile not found");
    err.statusCode = 404;
    throw err;
  }

  const mergedInput = {
    fieldOfStudy:
      input.fieldOfStudy != null ? input.fieldOfStudy : existing.field_of_study,
    gpa: input.gpa != null ? input.gpa : existing.gpa,
    degreeLevel:
      input.degreeLevel != null ? input.degreeLevel : existing.degree_level,
    preferredCountry:
      input.preferredCountry != null
        ? input.preferredCountry
        : existing.preferred_country,
    interests: input.interests != null ? input.interests : existing.interests,
  };

  const validated = validateProfileInput(mergedInput);
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

