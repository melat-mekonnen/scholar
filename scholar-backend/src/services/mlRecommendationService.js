const axios = require("axios");
const { env } = require("../config/env");
const observabilityService = require("./observability.service");

const CIRCUIT_BREAKER = {
  failureCount: 0,
  lastFailureAt: 0,
  openUntil: 0,
  failureThreshold: 3,
  cooldownMs: 60_000,
};

function normalizeServiceUrl(serviceUrl) {
  if (!serviceUrl) return "";
  return serviceUrl.replace(/\/+$|\/+$/g, "");
}

function normalizeScholarshipPayload(scholarship) {
  return {
    id: scholarship.id,
    title: scholarship.title,
    organization_name: scholarship.organization_name,
    country: scholarship.country,
    degree_level: scholarship.degree_level,
    field_of_study: scholarship.field_of_study,
    funding_type: scholarship.funding_type,
    deadline: scholarship.deadline,
    amount: scholarship.amount,
    description: scholarship.description,
    application_url: scholarship.application_url,
    gpa_requirement: scholarship.gpa_requirement ?? scholarship.gpaRequirement ?? 0,
    financial_need: scholarship.financial_need ?? false,
    preferred_funding_type: scholarship.preferred_funding_type ?? null,
  };
}

function buildServicePayload({ studentId, studentProfile, scholarships }) {
  return {
    studentId: studentId || null,
    studentProfile: studentProfile || null,
    scholarships: Array.isArray(scholarships)
      ? scholarships.map(normalizeScholarshipPayload)
      : [],
  };
}

function mapMlScoresToScholarships(scholarships, mlItems) {
  const mlScores = new Map();
  for (const item of Array.isArray(mlItems) ? mlItems : []) {
    if (item && item.scholarshipId) {
      mlScores.set(item.scholarshipId, {
        score: Number(item.score) || 0,
        explanation: String(item.explanation || ""),
      });
    }
  }

  return scholarships.map((scholarship) => {
    const mlEntry = mlScores.get(scholarship.id);
    const mlScore = mlEntry?.score ?? 0;
    const mlExplanation = mlEntry?.explanation;

    const recommendationConfidence = Math.round(
      Math.max(0, Math.min(100, mlScore * 100)),
    );

    const explanations = [
      ...(Array.isArray(scholarship.explanations) ? scholarship.explanations : []),
      ...(mlExplanation ? [mlExplanation] : []),
    ].filter(Boolean);

    const rankingReasons = [
      ...(Array.isArray(scholarship.rankingReasons) ? scholarship.rankingReasons : []),
      mlEntry
        ? `ML recommendation score ${Math.round(mlScore * 100)}%`
        : "Fallback scoring used when ML service was unavailable",
    ];

    const finalScore = Math.max(
      0,
      Math.min(
        1,
        (Number(scholarship.finalScore) || 0) * 0.7 + mlScore * 0.3,
      ),
    );

    return {
      ...scholarship,
      semanticScore: Number(scholarship.semanticScore) || mlScore,
      finalScore,
      mlScore,
      recommendationConfidence,
      explanations,
      rankingReasons,
    };
  });
}

function isCircuitOpen() {
  if (Date.now() >= CIRCUIT_BREAKER.openUntil) {
    CIRCUIT_BREAKER.failureCount = 0;
    CIRCUIT_BREAKER.openUntil = 0;
  }
  return CIRCUIT_BREAKER.openUntil > Date.now();
}

async function fetchMlRecommendations({ studentId, studentProfile, scholarships, timeoutMs = 5000 }) {
  if (!studentId && !studentProfile) {
    throw new Error("ML recommendation requests require studentId or studentProfile");
  }

  if (!Array.isArray(scholarships) || scholarships.length === 0) {
    throw new Error("ML recommendation requests require a scholarship candidate list");
  }

  if (scholarships.length > 50) {
    throw new Error("ML recommendation requests are limited to 50 scholarship candidates");
  }

  if (isCircuitOpen()) {
    throw new Error("ML service circuit breaker is open due to repeated failures");
  }

  const serviceUrl = normalizeServiceUrl(env.aiServiceUrl);
  if (!serviceUrl) {
    throw new Error("AI service URL is not configured");
  }

  const payload = buildServicePayload({ studentId, studentProfile, scholarships });
  const url = `${serviceUrl}/ml/recommend`;

  const response = await axios.post(url, payload, {
    timeout: timeoutMs,
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!Array.isArray(response.data)) {
    throw new Error("Unexpected ML service response format");
  }

  return {
    items: response.data,
    modelVersion: String(response.headers["x-model-version"] || "unknown"),
  };
}

async function getMlRecommendations({ studentId, studentProfile, scholarships, timeoutMs = 5000 }) {
  if (!studentProfile || !Array.isArray(scholarships) || scholarships.length === 0) {
    return null;
  }

  const start = Date.now();
  try {
    const { items, modelVersion } = await fetchMlRecommendations({
      studentId,
      studentProfile,
      scholarships,
      timeoutMs,
    });

    const latencyMs = Date.now() - start;
    const recommendations = mapMlScoresToScholarships(scholarships, items);
    CIRCUIT_BREAKER.failureCount = 0;
    CIRCUIT_BREAKER.openUntil = 0;

    observabilityService.recordMlRecommendation({
      success: true,
      latencyMs,
      modelVersion,
      count: recommendations.length,
      averageConfidence: recommendations.reduce((sum, rec) => sum + (rec.mlScore || 0), 0) / Math.max(1, recommendations.length),
    });

    return {
      recommendations,
      modelVersion,
      latencyMs,
      fallbackUsed: false,
      fallbackReason: null,
    };
  } catch (error) {
    const message = String(error.message || "ML service unavailable");
    console.warn("[ML_FALLBACK] Failed to get ML recommendations:", message);

    if (!isCircuitOpen()) {
      CIRCUIT_BREAKER.failureCount += 1;
      CIRCUIT_BREAKER.lastFailureAt = Date.now();
      if (CIRCUIT_BREAKER.failureCount >= CIRCUIT_BREAKER.failureThreshold) {
        CIRCUIT_BREAKER.openUntil = Date.now() + CIRCUIT_BREAKER.cooldownMs;
        console.warn("[ML_CIRCUIT_BREAKER] Opening circuit until", new Date(CIRCUIT_BREAKER.openUntil).toISOString());
      }
    }

    const recommendations = mapMlScoresToScholarships(scholarships, []);
    observabilityService.recordMlRecommendation({
      success: false,
      latencyMs: null,
      modelVersion: "unavailable",
      count: recommendations.length,
      averageConfidence: 0,
    });

    return {
      recommendations,
      modelVersion: "unavailable",
      latencyMs: null,
      fallbackUsed: true,
      fallbackReason: message,
    };
  }
}

module.exports = {
  getMlRecommendations,
};
