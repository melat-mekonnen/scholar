const axios = require("axios");
const { env } = require("../../config/env");
const { ScholarshipRepository } = require("../../repositories/ScholarshipRepository");
const { StudentProfileRepository } = require("../../repositories/StudentProfileRepository");
const { fetchScholarshipPoolForAi } = require("./scholarshipPoolForAi");
const { mapPublicScholarship } = require("../../utils/mapPublicOpportunity");

const scholarshipRepo = new ScholarshipRepository();
const profileRepo = new StudentProfileRepository();

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

function normalizeToken(value) {
  return String(value || "").trim().toLowerCase();
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length > 1);
}

function buildFallbackResults(rows, profile, topN, lang) {
  const degree = normalizeToken(profile?.degree_level);
  const field = normalizeToken(profile?.field_of_study);
  const country = normalizeToken(profile?.preferred_country);
  const interests = Array.isArray(profile?.interests)
    ? profile.interests.map(normalizeToken).filter(Boolean)
    : [];

  const queryTokens = [degree, field, country, ...interests].filter(Boolean);
  const querySet = new Set(queryTokens);

  const scored = (rows || []).map((row) => {
    const haystack = `${row.title || ""} ${row.description || ""} ${row.field_of_study || ""} ${row.country || ""}`;
    const rowTokens = tokenize(haystack);
    let score = 0;

    for (const token of rowTokens) {
      if (querySet.has(token)) score += 1;
    }

    if (degree && normalizeToken(row.degree_level) === degree) score += 4;
    if (field && normalizeToken(row.field_of_study).includes(field)) score += 6;
    if (country && normalizeToken(row.country) === country) score += 3;

    const matchedTerms = queryTokens.filter((token) =>
      token && rowTokens.some((rowToken) => rowToken.includes(token) || token.includes(rowToken)),
    );

    return {
      scholarship: mapPublicScholarship(row, lang),
      score,
      matchedTerms,
      matchedInterests: matchedTerms,
      matchPercentage: Math.min(99, Math.max(35, score * 8)),
    };
  });

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.scholarship?.title || "").localeCompare(String(b.scholarship?.title || ""));
    })
    .slice(0, Math.min(Math.max(Number(topN) || 10, 1), 20));
}

async function getRecommendations({ userId, topN = 10, lang = "en" }) {
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

  // Candidate pool: prefer profile-aligned rows (country, degree, field), then widen if too few.
  const search = await fetchScholarshipPoolForAi(scholarshipRepo, userId, profile, 200);

  const candidates = (search.results || []).map((s) => ({
    id: s.id,
    title: s.title || "",
    description: s.description || "",
  }));

  try {
    const aiUrl = `${env.aiServiceUrl.replace(/\/+$/, "")}/ai/recommend`;
    const { data } = await axios.post(
      aiUrl,
      {
        student: { id: userId, text: studentText },
        scholarships: candidates,
        topN: Math.min(Math.max(Number(topN) || 10, 1), 20),
        includeMatchedTerms: true,
      },
      { timeout: 8000 }
    );

    const byId = new Map((search.results || []).map((s) => [s.id, s]));
    const results = Array.isArray(data?.results) ? data.results : [];

    return {
      source: "ai",
      studentText,
      results: results
        .map((r) => {
          const s = byId.get(r.id);
          if (!s) return null;
          const matched = r.matchedTerms || [];
          const matchPercentage =
            r.matchPercent != null && Number.isFinite(Number(r.matchPercent))
              ? Number(r.matchPercent)
              : Math.round(Math.min(1, Math.max(0, Number(r.score) || 0)) * 10000) / 100;
          return {
            scholarship: mapPublicScholarship(s, lang),
            score: r.score,
            matchedTerms: matched,
            matchPercentage,
            matchedInterests: matched,
          };
        })
        .filter(Boolean),
    };
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;
    return {
      source: "fallback",
      studentText,
      results: buildFallbackResults(search.results || [], profile, topN, lang),
    };
  }
}

module.exports = { getRecommendations };

