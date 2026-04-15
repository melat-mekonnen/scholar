const REQUIRED_FIELDS = ["fieldOfStudy", "gpa", "degreeLevel"];

function calculateProfileCompleteness(profile) {
  let score = 0;

  if (profile.gpa != null) score += 25;
  if (profile.degreeLevel) score += 25;
  if (profile.fieldOfStudy) score += 25;
  if (Array.isArray(profile.interests) && profile.interests.length > 0) score += 25;

  return score;
}

function validateProfileInput(input) {
  const errors = [];

  const { fieldOfStudy, gpa, degreeLevel, preferredCountry, interests } = input;

  if (!fieldOfStudy || !fieldOfStudy.trim()) {
    errors.push("Field of study is required");
  }

  if (gpa == null || Number.isNaN(Number(gpa))) {
    errors.push("GPA is required and must be a number");
  } else if (gpa < 0.0 || gpa > 4.0) {
    errors.push("GPA must be between 0.0 and 4.0");
  }

  const allowedDegrees = ["high_school", "bachelor", "master", "phd"];
  if (!degreeLevel || !allowedDegrees.includes(degreeLevel)) {
    errors.push("Degree level must be one of: high_school, bachelor, master, phd");
  }

  if (interests) {
    if (!Array.isArray(interests)) {
      errors.push("Interests must be an array");
    } else if (interests.length > 10) {
      errors.push("Interests cannot have more than 10 items");
    }
  }

  if (errors.length) {
    const err = new Error(errors.join("; "));
    err.statusCode = 400;
    throw err;
  }

  return {
    fieldOfStudy,
    gpa,
    degreeLevel,
    preferredCountry: preferredCountry || null,
    interests: interests || [],
  };
}

module.exports = {
  calculateProfileCompleteness,
  validateProfileInput,
};

