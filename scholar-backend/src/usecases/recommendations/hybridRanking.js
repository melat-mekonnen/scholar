const { evaluateEligibility } = require("./eligibilityEngine");
const { evaluateProfileStrength } = require("./profileStrengthEngine");
const { estimateCompetitiveness, estimateDifficulty } = require("./competitivenessEngine");

function normalizeText(value) {
  if (!value) return "";
  return String(value).toLowerCase().trim();
}

function buildStrictQueryText(query) {
  if (!query) return "";
  return query
    .replace(/\b(?:only|strictly|must|exact)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isStrictQuery(query) {
  return /\b(?:only|strictly|must|exact)\b/i.test(query || "");
}

function matchesStrictQuery(scholarship, strictText) {
  if (!strictText) return true;
  const stopwords = new Set([
    "only",
    "strictly",
    "must",
    "exact",
    "scholarship",
    "scholarships",
    "in",
    "for",
    "the",
    "and",
    "to",
    "of",
    "be",
    "with",
    "a",
    "an",
    "is",
    "are",
  ]);
  const requiredTerms = strictText
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term && !stopwords.has(term));

  if (!requiredTerms.length) return true;

  const haystack = [
    scholarship.title,
    scholarship.description,
    scholarship.country,
    scholarship.funding_type,
    scholarship.degree_level,
    scholarship.field_of_study,
    scholarship.organization_name,
  ]
    .filter(Boolean)
    .map((value) => normalizeText(value));

  return requiredTerms.every((term) =>
    haystack.some((value) => value.includes(term)),
  );
}

function normalizeOption(value) {
  if (!value) return "";
  return normalizeText(value);
}

function matchesCountry(query, scholarship) {
  const queryText = normalizeText(query);
  return (
    normalizeOption(scholarship.country) &&
    queryText.includes(normalizeOption(scholarship.country))
  );
}

function matchesField(query, scholarship) {
  const queryText = normalizeText(query);
  return (
    normalizeOption(scholarship.field_of_study) &&
    queryText.includes(normalizeOption(scholarship.field_of_study))
  );
}

function matchesDegree(query, scholarship) {
  const queryText = normalizeText(query);
  return (
    normalizeOption(scholarship.degree_level) &&
    queryText.includes(normalizeOption(scholarship.degree_level))
  );
}

function isFullyFunded(query, scholarship) {
  const queryText = normalizeText(query);
  const funding = normalizeOption(scholarship.funding_type);
  return (
    /fully funded|full scholarship|full scholarship|fully-funded|full-funded/.test(queryText) ||
    /fully funded|full scholarship|fully-funded|full-funded/.test(funding)
  );
}

function isVerified(scholarship) {
  return normalizeOption(scholarship.status) === "verified";
}

function hasUrgentDeadline(scholarship) {
  if (!scholarship.deadline) return false;
  const deadlineDate = new Date(scholarship.deadline);
  const now = new Date();
  const deltaMs = deadlineDate - now;
  return deltaMs >= 0 && deltaMs <= 30 * 24 * 60 * 60 * 1000;
}

function isIncomplete(scholarship) {
  return (
    !scholarship.description ||
    !scholarship.application_url ||
    !scholarship.funding_type ||
    !scholarship.degree_level ||
    !scholarship.field_of_study
  );
}

function computeRecommendationConfidence({ semanticScore, eligibilityScore, profileStrengthScore, fieldMatch, countryMatch, completenessScore }) {
  const semanticComponent = semanticScore * 0.24;
  const eligibilityComponent = (eligibilityScore / 100) * 0.25;
  const profileComponent = (profileStrengthScore / 100) * 0.2;
  const alignmentComponent = (fieldMatch ? 0.12 : 0) + (countryMatch ? 0.09 : 0);
  const completenessComponent = (completenessScore / 100) * 0.1;
  const rawConfidence = semanticComponent + eligibilityComponent + profileComponent + alignmentComponent + completenessComponent;
  const score = Math.round(Math.max(0, Math.min(100, rawConfidence * 100)));
  const reasons = [];

  if (semanticScore >= 0.7) {
    reasons.push("Strong semantic relevance");
  } else {
    reasons.push("Semantic relevance is moderate");
  }

  if (eligibilityScore >= 80) {
    reasons.push("Eligibility score strongly supports this match");
  } else if (eligibilityScore >= 60) {
    reasons.push("Eligibility score is acceptable");
  } else {
    reasons.push("Eligibility score is limited");
  }

  if (profileStrengthScore >= 75) {
    reasons.push("Profile strength supports the recommendation");
  } else if (profileStrengthScore >= 50) {
    reasons.push("Profile strength provides some support");
  } else {
    reasons.push("Profile strength may need improvement");
  }

  if (fieldMatch) {
    reasons.push("Field matches directly");
  } else {
    reasons.push("Field alignment is weak");
  }

  if (countryMatch) {
    reasons.push("Country alignment supports this opportunity");
  } else {
    reasons.push("Country alignment is not a strong signal");
  }

  if (completenessScore >= 80) {
    reasons.push("Complete profile increases confidence");
  } else {
    reasons.push("Incomplete profile reduces confidence");
  }

  return { score, reasons };
}

function buildRecommendationExplanations({ rankingReasons, eligibility, profileStrength, fieldMatch, countryMatch, isFullyFundedScholarship, competitivenessLabel, difficulty }) {
  const explanations = [];
  if (eligibility && eligibility.explanation) {
    explanations.push(eligibility.explanation);
  }
  if (fieldMatch) {
    explanations.push("Field matches directly");
  }
  if (countryMatch) {
    explanations.push("Country alignment supports this opportunity");
  }
  if (isFullyFundedScholarship) {
    explanations.push("Excellent funding alignment");
  }
  if (competitivenessLabel === "high") {
    explanations.push("Scholarship is highly competitive");
  }
  if (difficulty === "elite") {
    explanations.push("This is an elite opportunity");
  }
  if (profileStrength) {
    if (profileStrength.reasons.some((reason) => reason.includes("GPA strength"))) {
      explanations.push("Strong GPA alignment");
    }
    if (profileStrength.reasons.some((reason) => reason.includes("research") || reason.includes("publication"))) {
      explanations.push("Profile includes research or publication experience");
    }
    if (profileStrength.reasons.some((reason) => reason.includes("Leadership"))) {
      explanations.push("Leadership experience is reflected in the profile");
    }
    if (profileStrength.score < 55 && !profileStrength.reasons.some((reason) => reason.includes("research"))) {
      explanations.push("Profile may need stronger research experience");
    }
  }
  if (rankingReasons && rankingReasons.length) {
    rankingReasons.forEach((reason) => explanations.push(reason));
  }
  return Array.from(new Set(explanations)).slice(0, 6);
}

function computeProfileStrengthBoost(profileStrengthScore) {
  if (profileStrengthScore >= 85) return 0.14;
  if (profileStrengthScore >= 70) return 0.1;
  if (profileStrengthScore >= 55) return 0.06;
  return 0;
}

function computeCompetitivenessPenalty(competitivenessScore, profileStrengthScore, eligibilityScore) {
  if (competitivenessScore >= 75 && profileStrengthScore < 65) {
    return 0.08;
  }
  if (competitivenessScore >= 75 && eligibilityScore < 70) {
    return 0.06;
  }
  if (competitivenessScore >= 65 && profileStrengthScore < 55) {
    return 0.04;
  }
  return 0;
}

function computeHybridScore(scholarship, query = "", filters = {}, strictMode = false, studentProfile = null, isPremium = false) {
  const semanticScore = Number(scholarship.semanticScore || 0);
  let finalScore = semanticScore;
  const rankingReasons = [];
  const eligibility = studentProfile ? evaluateEligibility(studentProfile, scholarship) : null;
  const profileCompleteness = Number(studentProfile?.completeness_score || studentProfile?.completenessScore || 0);
  const competitiveness = estimateCompetitiveness(scholarship);
  const difficulty = estimateDifficulty(scholarship);
  const createdAt = scholarship.created_at ? new Date(scholarship.created_at) : null;
  const isRecent = createdAt ? Date.now() - createdAt.getTime() <= 45 * 24 * 60 * 60 * 1000 : false;

  if (eligibility) {
    scholarship.eligibility = eligibility;
    if (eligibility.status === "eligible" && eligibility.score >= 80) {
      finalScore += 0.16;
      rankingReasons.push("Eligible profile match");
    }
    if (eligibility.status === "partially_eligible") {
      finalScore -= 0.08;
      rankingReasons.push("Partially eligible profile match");
    }
    if (eligibility.status === "not_eligible") {
      finalScore -= 0.18;
      rankingReasons.push("Not eligible for this profile");
    }
  }

  if (semanticScore > 0.75) {
    finalScore += 0.05;
    rankingReasons.push("Strong semantic match");
  }

  if (profileCompleteness >= 80) {
    finalScore += 0.12;
    rankingReasons.push("Complete profile improves recommendation quality");
  } else if (profileCompleteness >= 60) {
    finalScore += 0.06;
    rankingReasons.push("Moderately complete profile supports this match");
  }

  if (isFullyFunded(query, scholarship)) {
    finalScore += 0.18;
    rankingReasons.push("Matches fully funded intent");
  }

  if (matchesCountry(query, scholarship) || (filters.countries || []).some((c) => normalizeOption(c) === normalizeOption(scholarship.country))) {
    finalScore += isPremium ? 0.18 : 0.12;
    rankingReasons.push(`Country matched ${scholarship.country}${isPremium ? " (premium boost)" : ""}`);
  }

  if (matchesField(query, scholarship) || (filters.fieldsOfStudy || []).some((f) => normalizeOption(f) === normalizeOption(scholarship.field_of_study))) {
    finalScore += isPremium ? 0.14 : 0.1;
    rankingReasons.push(`Field matched ${scholarship.field_of_study}${isPremium ? " (premium boost)" : ""}`);
  }

  if (matchesDegree(query, scholarship) || (filters.degreeLevels || []).some((d) => normalizeOption(d) === normalizeOption(scholarship.degree_level))) {
    finalScore += isPremium ? 0.12 : 0.08;
    rankingReasons.push(`Degree level matched ${scholarship.degree_level}${isPremium ? " (premium boost)" : ""}`);
  }

  if (isVerified(scholarship)) {
    finalScore += isPremium ? 0.1 : 0.05;
    rankingReasons.push(isPremium ? "Verified scholarship (premium boost)" : "Verified scholarship");
  }

  if (hasUrgentDeadline(scholarship)) {
    finalScore += isPremium ? 0.13 : 0.05;
    rankingReasons.push(isPremium ? "Urgent deadline (premium alert)" : "Urgent deadline");
  }

  if (isRecent) {
    finalScore += isPremium ? 0.12 : 0.06;
    rankingReasons.push("Recent scholarship listing");
  }

  if (isIncomplete(scholarship)) {
    finalScore -= isPremium ? 0.12 : 0.15;
    rankingReasons.push("Incomplete scholarship details");
  }

  if (isPremium) {
    if (eligibility && eligibility.score >= 65) {
      finalScore += 0.08;
      rankingReasons.push("Premium profile compatibility boost");
    }
    if (eligibility && eligibility.status === "eligible") {
      finalScore += 0.1;
      rankingReasons.push("Premium eligible recommendation boost");
    }
    if (scholarship.amount || scholarship.funding_type) {
      finalScore += 0.05;
      rankingReasons.push("Premium application competitiveness boost");
    }
  }

  if (normalizeOption(scholarship.status) === "expired" || (scholarship.deadline && new Date(scholarship.deadline) < new Date())) {
    finalScore -= 0.45;
    rankingReasons.push("Expired scholarship");
  }

  if (strictMode && !matchesStrictQuery(scholarship, buildStrictQueryText(query))) {
    finalScore -= 0.25;
    rankingReasons.push("Strict query requires closer match");
  }

  if (isPremium && !scholarship.eligibility) {
    rankingReasons.push("Premium ranking includes advanced recommendation logic");
  }

  const fieldMatch = matchesField(query, scholarship) || (filters.fieldsOfStudy || []).some((f) => normalizeOption(f) === normalizeOption(scholarship.field_of_study));
  const countryMatch = matchesCountry(query, scholarship) || (filters.countries || []).some((c) => normalizeOption(c) === normalizeOption(scholarship.country));
  const degreeMatch = matchesDegree(query, scholarship) || (filters.degreeLevels || []).some((d) => normalizeOption(d) === normalizeOption(scholarship.degree_level));
  const isFullyFundedScholarship = isFullyFunded(query, scholarship);

  const profileStrength = studentProfile ? evaluateProfileStrength(studentProfile) : null;
  const profileStrengthScore = profileStrength?.score || 0;
  const profileStrengthBoost = computeProfileStrengthBoost(profileStrengthScore);
  if (profileStrengthBoost > 0) {
    finalScore += profileStrengthBoost;
    rankingReasons.push("Profile strength improves this recommendation");
  }

  const competitivenessPenalty = computeCompetitivenessPenalty(
    competitiveness.score,
    profileStrengthScore,
    eligibility?.score || 0,
  );
  if (competitivenessPenalty > 0) {
    finalScore -= competitivenessPenalty;
    rankingReasons.push("High competitiveness requires stronger applicant fit");
  }

  const { score: recommendationConfidence, reasons: confidenceReasons } = computeRecommendationConfidence({
    semanticScore,
    eligibilityScore: eligibility?.score || 0,
    profileStrengthScore,
    fieldMatch,
    countryMatch,
    completenessScore: profileCompleteness,
  });

  const explanations = buildRecommendationExplanations({
    rankingReasons,
    eligibility,
    profileStrength,
    fieldMatch,
    countryMatch,
    isFullyFundedScholarship,
    competitivenessLabel: competitiveness.label,
    difficulty,
  });

  finalScore = Math.max(0, Math.min(1, finalScore));

  return {
    semanticScore: Number(semanticScore.toFixed(4)),
    finalScore: Number(finalScore.toFixed(4)),
    rankingReasons,
    competitiveness: competitiveness.label,
    competitivenessScore: competitiveness.score,
    difficulty,
    recommendationConfidence,
    confidenceReasons,
    explanations,
    profileStrengthBoost: Number(profileStrengthBoost.toFixed(4)),
    competitivenessPenalty: Number(competitivenessPenalty.toFixed(4)),
  };
}

function rankScholarships({ scholarships = [], query = "", filters = {}, strictMode = false, studentProfile = null, isPremium = false }) {
  return scholarships
    .map((scholarship) => {
      const ranking = computeHybridScore(scholarship, query, filters, strictMode, studentProfile, isPremium);
      return {
        ...scholarship,
        ...ranking,
        eligibility: scholarship.eligibility || null,
      };
    })
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      const reasonCountDiff = (b.rankingReasons?.length || 0) - (a.rankingReasons?.length || 0);
      if (reasonCountDiff !== 0) {
        return reasonCountDiff;
      }
      return (b.semanticScore || 0) - (a.semanticScore || 0);
    });
}

module.exports = {
  buildStrictQueryText,
  isStrictQuery,
  matchesStrictQuery,
  rankScholarships,
};
