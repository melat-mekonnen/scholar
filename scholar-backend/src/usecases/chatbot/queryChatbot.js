const axios = require("axios");
const { env } = require("../../config/env");
const { StudentProfileRepository } = require("../../repositories/StudentProfileRepository");
const { ScholarshipRepository } = require("../../repositories/ScholarshipRepository");
const { fetchScholarshipPoolForAi } = require("../recommendations/scholarshipPoolForAi");
const { checkAiChatQuota } = require("../subscription/checkAiChatQuota");
const { consumeAiChatQuota } = require("../subscription/consumeAiChatQuota");
const { createChatQuotaExceededError } = require("../subscription/chatQuotaError");

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

function mapMlResponse(data) {
  const citations = Array.isArray(data?.citations) ? data.citations : [];
  const eligibility = Array.isArray(data?.eligibility) ? data.eligibility : [];
  return {
    source: "scholar-ml",
    answer: data?.answer || "",
    mode: data?.mode || "scholarship",
    profile_loaded: Boolean(data?.profile_loaded),
    citations,
    eligibility,
    intent: data?.mode || "scholarship",
    recommendations: citations.map((c) => ({
      name: c.title || "",
      url: c.url || "",
    })),
    deadlines: [],
  };
}

async function queryScholarMl({ userId, message, topK = 5 }) {
  const mlUrl = `${env.scholarMlChatUrl.replace(/\/+$/, "")}/v1/chat`;
  const basePayload = {
    message: String(message).trim(),
    user_id: userId,
    filters: {},
  };

  try {
    const { data } = await axios.post(
      mlUrl,
      {
        ...basePayload,
        dry_run: false,
      },
      { timeout: 300000 }
    );
    return mapMlResponse(data);
  } catch (error) {
    // If LLM generation fails (e.g. Ollama unavailable/forbidden), gracefully
    // fall back to retrieval-only response from Scholar-ML dry-run mode.
    if (!axios.isAxiosError(error)) throw error;
    const detail =
      String(error.response?.data?.detail || error.response?.data?.message || error.message || "").toLowerCase();
    if (!detail.includes("llm generation failed")) throw error;

    const { data } = await axios.post(
      mlUrl,
      {
        ...basePayload,
        dry_run: true,
      },
      { timeout: 300000 }
    );
    return mapMlResponse(data);
  }
}

async function queryLegacyAi({ userId, message, topK = 5 }) {
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

  const { data } = await axios.post(aiUrl, payload, { timeout: 90000 });
  return { ...data, source: "scholar-ai" };
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

  const quota = await checkAiChatQuota(userId);
  if (!quota.allowed) {
    throw createChatQuotaExceededError(quota);
  }

  const useScholarMl = Boolean(env.scholarMlChatUrl && String(env.scholarMlChatUrl).trim());

  try {
    await consumeAiChatQuota(userId);

    if (useScholarMl) {
      return await queryScholarMl({ userId, message, topK });
    }
    return await queryLegacyAi({ userId, message, topK });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const upstreamMessage =
        error.response?.data?.message ||
        error.response?.data?.detail ||
        error.message ||
        (useScholarMl ? "Scholar-ML chat service is unavailable" : "AI chatbot service is unavailable");
      const err = new Error(`Chatbot service error: ${upstreamMessage}`);
      err.statusCode = error.response?.status || 503;
      throw err;
    }
    throw error;
  }
}

module.exports = { queryChatbot };
