const { ScholarshipRepository } = require("../../repositories/ScholarshipRepository");
const { StudentProfileRepository } = require("../../repositories/StudentProfileRepository");
const { searchScholarships } = require("./vectorSearch");
const { evaluateProfileStrength } = require("./profileStrengthEngine");
const { getMlRecommendations } = require("../../services/mlRecommendationService");

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

function checkProfileCompleteness(profile) {
  return {
    gpa: profile?.gpa != null,
    fieldOfStudy: Boolean(profile?.field_of_study),
    degreeLevel: Boolean(profile?.degree_level),
    englishTests: Boolean(profile?.ielts || profile?.toefl),
  };
}

async function getRecommendations({ userId, topN = 10, q = "", isPremium = false }) {
  if (!userId) {
    const err = new Error("Authentication required");
    err.statusCode = 401;
    throw err;
  }

  const profile = await profileRepo.findByUserId(userId);
  const hasProfile = Boolean(profile);
  const profileCompleteness = checkProfileCompleteness(profile);
  const profileStrength = evaluateProfileStrength(profile || {});

  // Use vector search as the semantic fallback and baseline ranking source
  const searchResult = await searchScholarships({
    q,
    countries: [],
    degreeLevels: [],
    fieldsOfStudy: [],
    fundingTypes: [],
    deadlineFrom: "",
    deadlineTo: "",
    sort: "relevance",
    page: 1,
    limit: topN,
    status: "verified",
    bookmarkUserId: userId,
    studentProfile: profile,
    isPremium,
  });

  const mlResult = profile
    ? await getMlRecommendations({
        studentId: userId,
        studentProfile: profile,
        scholarships: searchResult.results,
      })
    : null;

  const results = mlResult?.recommendations || searchResult.results;
  const modelVersion = mlResult?.modelVersion || "unknown";
  const fallbackUsed = !profile || mlResult?.fallbackUsed || false;
  const fallbackReason = !profile
    ? "This student does not have a complete profile for ML ranking."
    : mlResult?.fallbackReason || null;
  const latencyMs = mlResult?.latencyMs ?? null;

  return {
    results,
    total: searchResult.total,
    hasProfile,
    profileCompleteness,
    profileStrength,
    modelVersion,
    fallbackUsed,
    fallbackReason,
    latencyMs,
  };
}

module.exports = { getRecommendations };

