const axios = require("axios");
const { env } = require("../../config/env");
const { StudentProfileRepository } = require("../../repositories/StudentProfileRepository");
const { ScholarshipRepository } = require("../../repositories/ScholarshipRepository");
const { fetchScholarshipPoolForAi } = require("../recommendations/scholarshipPoolForAi");

const profileRepo = new StudentProfileRepository();
const scholarshipRepo = new ScholarshipRepository();

function mapScholarship(row) {
  return {
    name: row.title || "",
    country: row.country || "",
    field: row.field_of_study || "",
    deadline: row.deadline || null,
    eligibility: row.description || "",
    funding_type: row.funding_type || "",
    level: row.degree_level || "",
  };
}

async function queryChatbot({ userId, message, topK = 5 }) {
  if (!userId) {
    const err = new Error("Authentication required");
    err.statusCode = 401;
    throw err;
  }
  if (!message || !String(message).trim()) {
    const err = new Error("Message is required");
    err.statusCode = 400;
    throw err;
  }

  const profile = await profileRepo.findByUserId(userId);
  const scholarships = await fetchScholarshipPoolForAi(scholarshipRepo, userId, profile, 300);

  const aiUrl = `${env.aiServiceUrl.replace(/\/+$/, "")}/ai/chat/query`;
  const payload = {
    message: String(message).trim(),
    topK: Math.min(Math.max(Number(topK) || 5, 1), 20),
    profile: profile
      ? {
          fieldOfStudy: profile.field_of_study || null,
          degreeLevel: profile.degree_level || null,
          gpa: profile.gpa != null ? Number(profile.gpa) : null,
          interests: Array.isArray(profile.interests) ? profile.interests : [],
          preferredCountry: profile.preferred_country || null,
        }
      : null,
    scholarships: (scholarships.results || []).map(mapScholarship),
    includePublicDataset: true,
  };

  try {
    // Chat uses fast TF‑IDF retrieval by default on the AI service; allow headroom for cold DB / large payloads.
    const { data } = await axios.post(aiUrl, payload, { timeout: 90000 });
    return data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const upstreamMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        "AI chatbot service is unavailable";
      const err = new Error(`Chatbot service error: ${upstreamMessage}`);
      err.statusCode = error.response?.status || 503;
      throw err;
    }
    throw error;
  }
}

module.exports = { queryChatbot };

