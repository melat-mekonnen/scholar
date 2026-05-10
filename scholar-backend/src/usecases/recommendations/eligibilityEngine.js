function normalizeText(value) {
  if (value == null) return "";
  return String(value).trim().toLowerCase();
}

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => normalizeText(item));
  if (typeof value === "string") {
    return value
      .split(/[,;|]/)
      .map((item) => normalizeText(item))
      .filter(Boolean);
  }
  return [];
}

function parseEnglishRequirements(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const normalized = value.toLowerCase();
    const matchIelts = normalized.match(/ielts\s*[:\s]*([0-9]+\.?[0-9]*)/);
    const matchToefl = normalized.match(/toefl\s*[:\s]*([0-9]+\.?[0-9]*)/);
    return {
      ielts: matchIelts ? Number(matchIelts[1]) : null,
      toefl: matchToefl ? Number(matchToefl[1]) : null,
      raw: value,
    };
  }
  if (typeof value === "object") {
    return {
      ielts: value.ielts != null ? Number(value.ielts) : null,
      toefl: value.toefl != null ? Number(value.toefl) : null,
      raw: value,
    };
  }
  return null;
}

function meetsEnglishRequirement(profileTests = {}, requirement) {
  if (!requirement) return { met: true, reason: "No English requirement specified" };
  const applicant = {
    ielts: profileTests.ielts != null ? Number(profileTests.ielts) : null,
    toefl: profileTests.toefl != null ? Number(profileTests.toefl) : null,
  };

  if (requirement.ielts != null) {
    if (applicant.ielts == null) {
      return { met: false, missing: true, reason: "IELTS score required" };
    }
    if (applicant.ielts < requirement.ielts) {
      return { met: false, reason: `IELTS minimum ${requirement.ielts} required` };
    }
  }

  if (requirement.toefl != null) {
    if (applicant.toefl == null) {
      return { met: false, missing: true, reason: "TOEFL score required" };
    }
    if (applicant.toefl < requirement.toefl) {
      return { met: false, reason: `TOEFL minimum ${requirement.toefl} required` };
    }
  }

  return { met: true, reason: "English requirements satisfied" };
}

function buildScholarshipRequirements(scholarship) {
  return {
    eligibleDegreeLevels: normalizeList(scholarship.eligible_degree_levels || scholarship.eligibleDegreeLevels || scholarship.degree_level),
    eligibleFields: normalizeList(scholarship.eligible_fields || scholarship.eligibleFields || scholarship.field_of_study),
    minimumGPA: scholarship.minimum_gpa != null ? Number(scholarship.minimum_gpa) : null,
    eligibleCountries: normalizeList(scholarship.eligible_countries || scholarship.eligibleCountries || scholarship.country),
    genderRestrictions: normalizeList(scholarship.gender_restrictions || scholarship.genderRestrictions),
    workExperienceRequired:
      scholarship.work_experience_required != null
        ? Number(scholarship.work_experience_required)
        : scholarship.workExperienceRequired != null
        ? Number(scholarship.workExperienceRequired)
        : null,
    englishRequirements: parseEnglishRequirements(scholarship.english_requirements || scholarship.englishRequirements),
    eligibleDisabilities: normalizeList(scholarship.eligible_disabilities || scholarship.eligibleDisabilities),
    eligibleMinorityStatus: normalizeList(scholarship.eligible_minority_status || scholarship.eligibleMinorityStatus),
    fundingType: normalizeText(scholarship.funding_type || scholarship.fundingType),
    deadline: scholarship.deadline || scholarship.deadline,
  };
}

function buildProfile(payload) {
  return {
    degreeLevel: normalizeText(payload.degreeLevel || payload.degree_level),
    fieldOfStudy: normalizeText(payload.fieldOfStudy || payload.field_of_study),
    gpa: payload.gpa != null ? Number(payload.gpa) : null,
    nationality: normalizeText(payload.nationality),
    targetCountry: normalizeText(payload.targetCountry || payload.preferredCountry || payload.target_country),
    gender: normalizeText(payload.gender),
    workExperienceYears:
      payload.workExperienceYears != null
        ? Number(payload.workExperienceYears)
        : payload.work_experience_years != null
        ? Number(payload.work_experience_years)
        : null,
    englishTests: {
      ielts: payload.englishTests?.ielts != null ? Number(payload.englishTests.ielts) : payload.ielts != null ? Number(payload.ielts) : null,
      toefl: payload.englishTests?.toefl != null ? Number(payload.englishTests.toefl) : payload.toefl != null ? Number(payload.toefl) : null,
    },
    financialNeed: payload.financialNeed === true || payload.financial_need === true,
    disabilities: normalizeList(payload.disabilities),
    minorityStatus: normalizeList(payload.minorityStatus || payload.minority_status),
  };
}

function isDeadlineExpired(deadline) {
  if (!deadline) return false;
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return deadlineDate < today;
}

function compareListMatch(profileValue, requirementList) {
  if (!requirementList || !requirementList.length) return { matched: true, reason: "No explicit list requirement" };
  if (!profileValue) {
    return { matched: false, missing: true, reason: "Profile information missing" };
  }
  return requirementList.includes(normalizeText(profileValue))
    ? { matched: true, reason: `Matches required value ${profileValue}` }
    : { matched: false, reason: `Does not match required value ${profileValue}` };
}

function scoreEligibility({ matched, partial, failed, weight }) {
  if (failed) return -weight;
  if (matched) return weight;
  if (partial) return Math.ceil(weight / 2);
  return 0;
}

function determineStatus({ hardFailures, partialReasons, requiredIssues, score }) {
  if (hardFailures.length) {
    return "not_eligible";
  }

  if (requiredIssues.length || partialReasons.length || score < 80) {
    return "partially_eligible";
  }

  return "eligible";
}

function buildExplanation({ status, matchedRules, failedRules, partialRules }) {
  if (status === "not_eligible") {
    return failedRules.length
      ? `Not eligible: ${failedRules.join("; ")}.`
      : "Not eligible for this scholarship.";
  }

  if (status === "partially_eligible") {
    const parts = [];
    if (matchedRules.length) parts.push(`You satisfy ${matchedRules.join(", ")}`);
    if (partialRules.length) parts.push(`${partialRules.join("; ")}`);
    return parts.length > 0
      ? `${parts.join(". ")}.`
      : "You are partially eligible for this scholarship.";
  }

  if (matchedRules.length) {
    return `You meet ${matchedRules.join(", ")}.`;
  }

  return "You appear eligible for this scholarship.";
}

function evaluateEligibility(studentProfile, scholarship) {
  const profile = buildProfile(studentProfile || {});
  const requirements = buildScholarshipRequirements(scholarship || {});

  const matchedRules = [];
  const failedRules = [];
  const partialRules = [];
  const requiredIssues = [];
  let score = 50;

  if (isDeadlineExpired(requirements.deadline)) {
    failedRules.push("Expired scholarship deadline");
    score = 0;
    return {
      status: "not_eligible",
      score,
      matchedRules,
      failedRules,
      explanation: buildExplanation({ status: "not_eligible", matchedRules, failedRules, partialRules }),
    };
  }

  const degreeResult = compareListMatch(profile.degreeLevel, requirements.eligibleDegreeLevels);
  if (degreeResult.matched) {
    score += 18;
    matchedRules.push("Degree requirement met");
  } else if (degreeResult.missing) {
    partialRules.push("Degree level information missing");
    score += 9;
  } else {
    failedRules.push("Degree level does not match scholarship requirement");
    requiredIssues.push("degree");
  }

  const fieldResult = compareListMatch(profile.fieldOfStudy, requirements.eligibleFields);
  if (fieldResult.matched) {
    score += 16;
    matchedRules.push("Field of study requirement met");
  } else if (fieldResult.missing) {
    partialRules.push("Field of study information missing");
    score += 8;
  } else {
    failedRules.push("Field of study does not match scholarship requirement");
    requiredIssues.push("field");
  }

  const countryCandidates = [];
  if (profile.nationality) countryCandidates.push(profile.nationality);
  if (profile.targetCountry) countryCandidates.push(profile.targetCountry);
  let countryMatched = false;
  if (requirements.eligibleCountries.length) {
    const normalizedCountries = requirements.eligibleCountries;
    if (profile.nationality && normalizedCountries.includes(profile.nationality)) countryMatched = true;
    if (!countryMatched && profile.targetCountry && normalizedCountries.includes(profile.targetCountry)) countryMatched = true;

    if (countryMatched) {
      score += 15;
      matchedRules.push("Country requirement met");
    } else if (!profile.nationality && !profile.targetCountry) {
      partialRules.push("Country information missing for eligibility check");
      score += 8;
    } else {
      failedRules.push("Applicant nationality or target country is not eligible");
      requiredIssues.push("country");
    }
  } else if (scholarship.country && profile.targetCountry) {
    if (normalizeText(scholarship.country) === profile.targetCountry) {
      score += 10;
      matchedRules.push("Target country matches scholarship location");
      countryMatched = true;
    }
  }

  if (requirements.minimumGPA != null) {
    if (profile.gpa == null) {
      partialRules.push("GPA information missing");
      score += 10;
    } else if (profile.gpa < requirements.minimumGPA) {
      failedRules.push(`GPA below the minimum required ${requirements.minimumGPA}`);
      requiredIssues.push("gpa");
    } else {
      score += 20;
      matchedRules.push("GPA requirement met");
    }
  }

  if (requirements.genderRestrictions.length) {
    if (!profile.gender) {
      partialRules.push("Gender information missing for restricted scholarship");
      score += 4;
    } else if (requirements.genderRestrictions.includes(profile.gender)) {
      score += 8;
      matchedRules.push("Gender requirement met");
    } else {
      failedRules.push("Gender does not meet scholarship restrictions");
      requiredIssues.push("gender");
    }
  }

  if (requirements.workExperienceRequired != null) {
    if (profile.workExperienceYears == null) {
      partialRules.push("Work experience information missing");
      score += 4;
    } else if (profile.workExperienceYears < requirements.workExperienceRequired) {
      failedRules.push(`Requires at least ${requirements.workExperienceRequired} years of experience`);
      requiredIssues.push("work_experience");
    } else {
      score += 8;
      matchedRules.push("Work experience requirement met");
    }
  }

  const englishResult = meetsEnglishRequirement(profile.englishTests, requirements.englishRequirements);
  if (requirements.englishRequirements) {
    if (englishResult.met) {
      score += 8;
      matchedRules.push("English requirement met");
    } else if (englishResult.missing) {
      partialRules.push("English test information missing");
      score += 4;
    } else {
      failedRules.push(englishResult.reason);
      requiredIssues.push("english");
    }
  }

  if (requirements.eligibleDisabilities.length) {
    if (profile.disabilities.length && profile.disabilities.some((d) => requirements.eligibleDisabilities.includes(d))) {
      score += 6;
      matchedRules.push("Disability preferences matched");
    }
  }

  if (requirements.eligibleMinorityStatus.length) {
    if (profile.minorityStatus.length && profile.minorityStatus.some((d) => requirements.eligibleMinorityStatus.includes(d))) {
      score += 6;
      matchedRules.push("Minority status preference matched");
    }
  }

  if (profile.financialNeed && requirements.fundingType) {
    if (requirements.fundingType.includes("fully funded") || requirements.fundingType.includes("full scholarship")) {
      score += 6;
      matchedRules.push("Funding type aligns with financial need");
    }
  }

  if (!countryMatched && requirements.eligibleCountries.length && profile.targetCountry) {
    // no additional score.
  }

  score = Math.max(0, Math.min(100, score));

  const status = determineStatus({
    hardFailures: failedRules,
    partialReasons: partialRules,
    requiredIssues,
    score,
  });

  const explanation = buildExplanation({ status, matchedRules, failedRules, partialRules });

  return {
    status,
    score,
    matchedRules,
    failedRules,
    explanation,
  };
}

module.exports = {
  evaluateEligibility,
  buildProfile,
  buildScholarshipRequirements,
};
