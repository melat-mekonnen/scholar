const axios = require("axios");
const { env } = require("../../config/env");
const { ScholarshipRepository } = require("../../repositories/ScholarshipRepository");
const { StudentProfileRepository } = require("../../repositories/StudentProfileRepository");
const { mapPublicScholarship } = require("../../utils/mapPublicOpportunity");
const { fetchScholarshipPoolForAi } = require("./scholarshipPoolForAi");

const scholarshipRepo = new ScholarshipRepository();
const profileRepo = new StudentProfileRepository();
const recommendationCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Blend: TF-IDF (scholar-ai) vs structured profile rules */
const HYBRID_AI_WEIGHT = 0.4;
const HYBRID_RULE_WEIGHT = 0.6;
const MIN_HYBRID_PERCENT = 45;
const MIN_WEIGHTED_ONLY_PERCENT = 50;

/** Final score boosts — field & interests first; country only when core alignment exists */
const BOOST_FIELD_EXACT = 16;
const BOOST_FIELD_RELATED = 8;
const BOOST_INTEREST_EACH = 4;
const BOOST_INTEREST_MAX = 12;
const BOOST_COUNTRY = 8;

function getCached(key) {
  const hit = recommendationCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    recommendationCache.delete(key);
    return null;
  }
  return hit.value;
}

function setCached(key, value) {
  recommendationCache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value,
  });
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeDegree(value) {
  const v = normalize(value).replace(/[^a-z0-9]/g, "");
  if (!v) return "";
  if (["highschool", "secondary", "preuniversity"].includes(v)) return "high_school";
  if (["bachelor", "bachelors", "bachelorsdegree", "undergraduate", "ug"].includes(v)) return "bachelor";
  if (["master", "masters", "mastersdegree", "msc", "ma", "postgraduate", "pg"].includes(v)) return "master";
  if (["phd", "doctorate", "doctoral", "doctoraldegree"].includes(v)) return "phd";
  return v;
}

function inferScholarshipDegree(scholarship) {
  const explicit = normalizeDegree(scholarship?.degree_level);
  if (explicit) return explicit;
  const haystack = normalize(`${scholarship?.title || ""} ${scholarship?.description || ""}`);
  if (/\b(phd|doctorate|doctoral)\b/.test(haystack)) return "phd";
  if (/\b(master|masters|msc|postgraduate)\b/.test(haystack)) return "master";
  if (/\b(bachelor|bachelors|undergraduate)\b/.test(haystack)) return "bachelor";
  if (/\b(high school|secondary)\b/.test(haystack)) return "high_school";
  return "";
}

function parseRequiredGpa(scholarship) {
  const direct = Number(scholarship?.required_gpa);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const text = `${scholarship?.description || ""} ${scholarship?.title || ""}`;
  const match = text.match(/(?:min(?:imum)?\s*)?gpa[^0-9]*([0-4](?:\.\d+)?)/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

const FIELD_RELATIONS = {
  "public policy": [
    "political science",
    "government",
    "international relations",
    "social science",
  ],
  "social science": [
    "public policy",
    "political science",
    "government",
    "international relations",
  ],
  "political science": [
    "public policy",
    "social science",
    "government",
    "international relations",
  ],
};

function buildScholarshipTags(scholarship) {
  const explicitTags = Array.isArray(scholarship?.tags) ? scholarship.tags : [];
  const inferred = [
    scholarship?.field_of_study,
    scholarship?.degree_level,
    scholarship?.country,
    ...String(scholarship?.title || "").split(/\W+/),
    ...String(scholarship?.description || "").split(/\W+/).slice(0, 80),
  ];

  return [...explicitTags, ...inferred]
    .map(normalize)
    .filter((v) => v && v.length > 1);
}

function fieldsAreRelated(a, b) {
  if (!a || !b) return false;
  const normalizedA = normalize(a);
  const normalizedB = normalize(b);
  if (normalizedA === normalizedB) return true;
  return (
    (FIELD_RELATIONS[normalizedA] || []).includes(normalizedB) ||
    (FIELD_RELATIONS[normalizedB] || []).includes(normalizedA)
  );
}

function assessFieldMatch(student, scholarship) {
  const studentField = normalize(student?.field);
  const scholarshipField = normalize(scholarship?.field_of_study);
  if (!studentField || !scholarshipField) {
    return { exact: false, related: false };
  }
  if (studentField === scholarshipField) {
    return { exact: true, related: false };
  }
  if (
    fieldsAreRelated(student.field, scholarship.field_of_study) ||
    scholarshipField.includes(studentField) ||
    studentField.includes(scholarshipField)
  ) {
    return { exact: false, related: true };
  }
  return { exact: false, related: false };
}

function assessCountryMatch(student, scholarship) {
  const studentCountry = normalize(student?.country);
  const scholarshipCountry = normalize(scholarship?.country);
  if (!studentCountry || !scholarshipCountry) return false;
  return studentCountry === scholarshipCountry;
}

/** Must match major field (exact/related) OR at least one area-of-interest; country alone is not enough */
function passesCoreAlignmentGate(rule) {
  const fieldOk = Boolean(rule.fieldMatch || rule.fieldRelated);
  const interestOk = Array.isArray(rule.matchedInterests) && rule.matchedInterests.length > 0;
  return fieldOk || interestOk;
}

function getMatchedInterests(interests, tags) {
  const normalizedInterests = interests.map(normalize).filter(Boolean);
  const normalizedTags = tags.map(normalize).filter(Boolean);

  const matched = [];
  for (const interest of normalizedInterests) {
    const hit = normalizedTags.some((tag) => {
      return (
        tag.includes(interest) ||
        interest.includes(tag) ||
        fieldsAreRelated(interest, tag)
      );
    });
    if (hit && !matched.includes(interest)) matched.push(interest);
  }
  return matched;
}

function calculateMatch(student, scholarship) {
  let score = 0;
  const requiredGpa = parseRequiredGpa(scholarship);
  const studentGpa = Number(student?.gpa || 0);
  const fieldStatus = assessFieldMatch(student, scholarship);
  const countryMatch = assessCountryMatch(student, scholarship);

  // GPA (8%)
  if (!requiredGpa || requiredGpa <= 0) {
    score += 8;
  } else if (studentGpa >= requiredGpa) {
    score += 8;
  } else {
    score += Math.max(0, Math.min(1, studentGpa / requiredGpa)) * 8;
  }

  // 1) Major field (40% exact, 24% related)
  if (fieldStatus.exact) {
    score += 40;
  } else if (fieldStatus.related) {
    score += 24;
  }

  // 2) Areas of interest (up to 28%)
  const matchedInterests = getMatchedInterests(student.interests, buildScholarshipTags(scholarship));
  score += Math.min(matchedInterests.length * 8, 28);

  // 3) Country (12%) — tie-breaker only; never sufficient alone
  if (countryMatch) {
    score += 12;
  }

  // Degree level (12%)
  const studentDegree = normalizeDegree(student?.degree_level);
  const scholarshipDegree = inferScholarshipDegree(scholarship);
  const degreeMatch = Boolean(studentDegree && scholarshipDegree && studentDegree === scholarshipDegree);
  if (degreeMatch) {
    score += 12;
  }

  const interestMatch = matchedInterests.length > 0;

  return {
    matchPercentage: Math.round(Math.min(score, 100) * 100) / 100,
    matchedInterests,
    degreeMatch,
    fieldMatch: fieldStatus.exact,
    fieldRelated: fieldStatus.related,
    countryMatch,
    interestMatch,
  };
}

function buildStudentText(profile) {
  const field = String(profile.field_of_study || "").trim();
  const interests = Array.isArray(profile.interests) ? profile.interests : [];
  const country = String(profile.preferred_country || "").trim();
  const parts = [
    field,
    field,
    ...interests,
    ...interests,
    profile.degree_level,
    country,
    profile.gpa != null ? `gpa ${profile.gpa}` : "",
    "scholarship",
    "2026",
  ];
  return parts.map((p) => String(p || "").trim()).filter(Boolean).join(" ");
}

function mapScholarshipForAi(row) {
  const field = row.field_of_study ? String(row.field_of_study).trim() : "";
  const country = row.country ? String(row.country).trim() : "";
  const body = row.description ? String(row.description).trim() : "";
  const description = [field, country, body].filter(Boolean).join("\n");
  return {
    id: String(row.id),
    title: row.title || "",
    description,
  };
}

/** UI labels only: student major + matched profile interests (no raw TF-IDF tokens). */
function buildDisplayMatchLabels(profile, rule) {
  const seen = new Set();
  const out = [];

  const fieldLabel = String(profile.field_of_study || "").trim();
  if (fieldLabel && (rule.fieldMatch || rule.fieldRelated)) {
    seen.add(normalize(fieldLabel));
    out.push(fieldLabel);
  }

  for (const interest of rule.matchedInterests || []) {
    const key = normalize(interest);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(String(interest).trim());
  }

  return out.slice(0, 6);
}

function roundMatchPercent(value) {
  return Math.round(Math.min(100, Math.max(0, Number(value) || 0)));
}

function blendScores(aiPercent, rulePercent) {
  const ai = Number(aiPercent) || 0;
  const rule = Number(rulePercent) || 0;
  const blended = HYBRID_AI_WEIGHT * ai + HYBRID_RULE_WEIGHT * rule;
  return roundMatchPercent(blended);
}

function applyPriorityBoost(basePercent, rule) {
  let bonus = 0;
  if (rule.fieldMatch) bonus += BOOST_FIELD_EXACT;
  else if (rule.fieldRelated) bonus += BOOST_FIELD_RELATED;

  const interestCount = Array.isArray(rule.matchedInterests) ? rule.matchedInterests.length : 0;
  if (interestCount > 0) {
    bonus += Math.min(interestCount * BOOST_INTEREST_EACH, BOOST_INTEREST_MAX);
  }

  const coreAligned = rule.fieldMatch || rule.fieldRelated || interestCount > 0;
  if (coreAligned && rule.countryMatch) {
    bonus += BOOST_COUNTRY;
  }

  return roundMatchPercent(basePercent + bonus);
}

/** Sort: major field → interests → country → score */
function compareByPriority(a, b) {
  const rankKey = (row) => {
    const fieldTier = row.fieldMatch ? 300 : row.fieldRelated ? 200 : 0;
    const interestTier = Math.min(
      Array.isArray(row.matchedInterests) ? row.matchedInterests.length : 0,
      5,
    ) * 20;
    const countryTier = row.countryMatch ? 5 : 0;
    return fieldTier + interestTier + countryTier;
  };

  const keyDiff = rankKey(b) - rankKey(a);
  if (keyDiff !== 0) return keyDiff;
  return b.matchPercentage - a.matchPercentage;
}

function toResultRow(scholarship, rule, ai, profile) {
  const aiPercent = ai ? ai.matchPercent : null;
  const basePercent = ai
    ? blendScores(aiPercent, rule.matchPercentage)
    : roundMatchPercent(rule.matchPercentage);
  const matchPercentage = applyPriorityBoost(basePercent, rule);

  return {
    scholarship: mapPublicScholarship(scholarship),
    matchPercentage,
    matchedInterests: buildDisplayMatchLabels(profile, rule),
    degreeMatch: rule.degreeMatch,
    fieldMatch: rule.fieldMatch,
    fieldRelated: rule.fieldRelated,
    interestMatch: rule.interestMatch,
    countryMatch: rule.countryMatch,
    ruleMatchPercentage: roundMatchPercent(rule.matchPercentage),
    aiMatchPercentage: aiPercent != null ? roundMatchPercent(aiPercent) : null,
  };
}

function passesResultFilters(row, minPercent) {
  const coreAligned =
    row.fieldMatch ||
    row.fieldRelated ||
    (Array.isArray(row.matchedInterests) && row.matchedInterests.length > 0);

  // Country-only matches are excluded (must align on major field and/or interests)
  if (row.countryMatch && !coreAligned) return false;

  return row.degreeMatch && coreAligned && row.matchPercentage >= minPercent;
}

async function fetchAiScores(userId, studentText, rows, topN) {
  const aiUrl = `${env.aiServiceUrl.replace(/\/+$/, "")}/ai/recommend`;
  const { data } = await axios.post(
    aiUrl,
    {
      student: { id: userId, text: studentText },
      scholarships: rows.map(mapScholarshipForAi),
      topN: Math.min(rows.length, Math.max(topN * 3, topN)),
      includeMatchedTerms: true,
    },
    { timeout: 60000 },
  );

  const byId = new Map();
  for (const r of data?.results || []) {
    byId.set(String(r.id), {
      matchPercent: Number(r.matchPercent ?? 0),
      score: Number(r.score ?? 0),
      matchedTerms: Array.isArray(r.matchedTerms) ? r.matchedTerms : [],
    });
  }
  return byId;
}

function rankWeightedOnly(student, profile, rows, effectiveTopN) {
  return rows
    .map((scholarship) =>
      toResultRow(scholarship, calculateMatch(student, scholarship), null, profile),
    )
    .filter((row) => passesResultFilters(row, MIN_WEIGHTED_ONLY_PERCENT))
    .sort(compareByPriority)
    .slice(0, effectiveTopN);
}

function rankHybrid(student, profile, rows, aiById, effectiveTopN) {
  return rows
    .map((scholarship) => {
      const rule = calculateMatch(student, scholarship);
      const ai = aiById.get(String(scholarship.id)) || null;
      return toResultRow(scholarship, rule, ai, profile);
    })
    .filter((row) => passesResultFilters(row, MIN_HYBRID_PERCENT))
    .sort(compareByPriority)
    .slice(0, effectiveTopN);
}

async function getRecommendations({ userId, topN = 10 }) {
  if (!userId) {
    const err = new Error("Authentication required");
    err.statusCode = 401;
    throw err;
  }

  const profile = await profileRepo.findByUserId(userId);

  if (
    !profile ||
    !profile.gpa ||
    !profile.field_of_study ||
    !profile.preferred_country ||
    !profile.degree_level
  ) {
    const err = new Error("Complete your profile to get recommendations");
    err.statusCode = 400;
    throw err;
  }

  const student = {
    gpa: Number(profile.gpa),
    field: normalize(profile.field_of_study),
    country: normalize(profile.preferred_country),
    interests: Array.isArray(profile.interests)
      ? profile.interests.map((i) => normalize(i)).filter(Boolean)
      : [],
    degree_level: normalize(profile.degree_level),
  };

  const studentText = buildStudentText(profile);
  const effectiveTopN = Math.min(Math.max(Number(topN) || 10, 1), 20);
  const cacheKey = `rec:hybrid:v2:${userId}:${studentText}:${effectiveTopN}:${String(profile?.updated_at || "")}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const search = await fetchScholarshipPoolForAi(scholarshipRepo, userId, profile, 300);
  const rows = search.results || [];

  if (rows.length === 0) {
    const empty = {
      source: "hybrid",
      student: { ...student, text: studentText },
      results: [],
    };
    setCached(cacheKey, empty);
    return empty;
  }

  let source = "weighted";
  let ranked = [];

  try {
    const aiById = await fetchAiScores(userId, studentText, rows, effectiveTopN);
    ranked = rankHybrid(student, profile, rows, aiById, effectiveTopN);
    if (ranked.length > 0) {
      source = "hybrid";
    } else {
      ranked = rankWeightedOnly(student, profile, rows, effectiveTopN);
      source = "weighted";
    }
  } catch {
    ranked = rankWeightedOnly(student, profile, rows, effectiveTopN);
    source = "weighted";
  }

  const response = {
    source,
    student: { ...student, text: studentText },
    results: ranked,
  };
  setCached(cacheKey, response);
  return response;
}

module.exports = { getRecommendations };
