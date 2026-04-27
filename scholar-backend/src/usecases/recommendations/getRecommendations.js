const axios = require("axios");
const { env } = require("../../config/env");
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

function buildStudentText(profile) {
  const parts = [];
  if (profile?.degree_level) parts.push(profile.degree_level);
  if (profile?.field_of_study) parts.push(profile.field_of_study);
  if (profile?.preferred_country) parts.push(profile.preferred_country);
  if (Array.isArray(profile?.interests) && profile.interests.length) {
    parts.push(profile.interests.join(" "));
  }
  return parts.join(" ").trim();
}

async function getRecommendations({ userId, topN = 10 }) {
  if (!userId) {
    const err = new Error("Authentication required");
    err.statusCode = 401;
    throw err;
  }

  const profile = await profileRepo.findByUserId(userId);
  const studentText = buildStudentText(profile);
  if (!studentText) {
    const err = new Error("Complete your profile to get recommendations");
    err.statusCode = 400;
    throw err;
  }
  const effectiveTopN = Math.min(Math.max(Number(topN) || 10, 1), 20);
  const cacheKey = JSON.stringify({
    userId,
    topN: effectiveTopN,
    profileUpdatedAt: String(profile?.updated_at || ""),
    studentText,
  });
  const cached = getCached(cacheKey);
  if (cached) return cached;

  // Candidate pool: take a reasonable slice of verified scholarships.
  // (simple first version; later you can prefilter by country/degree, or paginate)
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

  const candidates = (search.results || []).map((s) => ({
    id: s.id,
    title: s.title || "",
    description: s.description || "",
  }));

  const aiUrl = `${env.aiServiceUrl.replace(/\/+$/, "")}/ai/recommend`;
  const { data } = await axios.post(
    aiUrl,
    {
      student: { id: userId, text: studentText },
      scholarships: candidates,
      topN: effectiveTopN,
      includeMatchedTerms: true,
    },
    { timeout: 8000 }
  );

  const byId = new Map((search.results || []).map((s) => [s.id, s]));
  const results = Array.isArray(data?.results) ? data.results : [];

  const response = {
    studentText,
    results: results
      .map((r) => {
        const s = byId.get(r.id);
        if (!s) return null;
        return {
          scholarship: s,
          score: r.score,
          matchedTerms: r.matchedTerms || [],
        };
      })
      .filter(Boolean),
  };
  setCached(cacheKey, response);
  return response;
}

module.exports = { getRecommendations };

