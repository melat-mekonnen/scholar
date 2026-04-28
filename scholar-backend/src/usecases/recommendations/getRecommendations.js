const { ScholarshipRepository } = require("../../repositories/ScholarshipRepository");
const { StudentProfileRepository } = require("../../repositories/StudentProfileRepository");

const scholarshipRepo = new ScholarshipRepository();
const profileRepo = new StudentProfileRepository();
const recommendationCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

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

function getMatchedInterests(interests, tags) {
  const normalizedInterests = interests.map(normalize).filter(Boolean);
  const normalizedTags = tags.map(normalize).filter(Boolean);

  const matched = [];
  for (const interest of normalizedInterests) {
    const hit = normalizedTags.some(
      (tag) => tag.includes(interest) || interest.includes(tag)
    );
    if (hit && !matched.includes(interest)) matched.push(interest);
  }
  return matched;
}

function calculateMatch(student, scholarship) {
  let score = 0;
  const requiredGpa = parseRequiredGpa(scholarship);
  const studentGpa = Number(student?.gpa || 0);

  // GPA (25%)
  if (!requiredGpa || requiredGpa <= 0) {
    score += 25;
  } else if (studentGpa >= requiredGpa) {
    score += 25;
  } else {
    score += Math.max(0, Math.min(1, studentGpa / requiredGpa)) * 25;
  }

  // Field (30%)
  if (normalize(student?.field) && normalize(student?.field) === normalize(scholarship?.field_of_study)) {
    score += 30;
  }

  // Country (10%)
  if (normalize(student?.country) && normalize(student?.country) === normalize(scholarship?.country)) {
    score += 10;
  }

  // Interest (20%) - flexible includes matching, 8 points each
  const matchedInterests = getMatchedInterests(student.interests, buildScholarshipTags(scholarship));
  score += Math.min(matchedInterests.length * 8, 20);

  // Degree level (15%)
  const studentDegree = normalizeDegree(student?.degree_level);
  const scholarshipDegree = inferScholarshipDegree(scholarship);
  if (studentDegree && scholarshipDegree && studentDegree === scholarshipDegree) {
    score += 15;
  }

  return {
    matchPercentage: Math.round(score * 100) / 100,
    matchedInterests,
  };
}

async function getRecommendations({ userId, topN = 10 }) {
  if (!userId) {
    const err = new Error("Authentication required");
    err.statusCode = 401;
    throw err;
  }

  const profile = await profileRepo.findByUserId(userId);

  // ✅ Validate profile
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

  // ✅ Build student object
  const student = {
    gpa: Number(profile.gpa),
    field: normalize(profile.field_of_study),
    country: normalize(profile.preferred_country),
    interests: Array.isArray(profile.interests)
      ? profile.interests.map((i) => normalize(i)).filter(Boolean)
      : [],
    degree_level: normalize(profile.degree_level),
  };

  const effectiveTopN = Math.min(Math.max(Number(topN) || 10, 1), 20);
  const cacheKey = `rec:${userId}:${student.interests.join(",")}:${student.gpa}:${student.field}:${student.country}:${student.degree_level}:${effectiveTopN}:${String(profile?.updated_at || "")}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // ✅ Fetch scholarships
  const search = await scholarshipRepo.searchPublic({
    q: "",
    countries: [],
    degreeLevels: [],
    fieldsOfStudy: [],
    fundingTypes: [],
    deadlineFrom: "",
    deadlineTo: "",
    sort: "recent",
    page: 1,
    limit: 200,
    status: "verified",
    bookmarkUserId: userId,
  });

  const ranked = (search.results || [])
    .map((scholarship) => {
      const result = calculateMatch(student, scholarship);
      return {
        scholarship,
        matchPercentage: result.matchPercentage,
        matchedInterests: result.matchedInterests,
      };
    })
    .filter((row) => row.matchPercentage >= 50)
    .sort((a, b) => b.matchPercentage - a.matchPercentage)
    .slice(0, effectiveTopN);

  const response = {
    source: "weighted",
    student,
    results: ranked,
  };
  setCached(cacheKey, response);
  return response;
}

module.exports = { getRecommendations };