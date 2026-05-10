const { ScholarshipRepository } = require("../repositories/ScholarshipRepository");
const { vectorLiteral } = require("./embeddingService");

function normalizeText(value) {
  if (!value) return "";
  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value).trim());
    const path = url.pathname.replace(/\/+$|\\?$/, "");
    const query = url.search || "";
    return `${url.protocol}//${url.hostname}${path}${query}`.replace(/\/+$/, "");
  } catch (_err) {
    const cleaned = String(value).trim().replace(/\/+$/, "");
    return cleaned || null;
  }
}

function normalizeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parseEmbedding(value) {
  if (Array.isArray(value)) return value.map((item) => Number(item));
  if (typeof value === "string") {
    return value
      .replace(/\[|\]/g, "")
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => !Number.isNaN(item));
  }
  return null;
}

function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    const av = Number(a[i]) || 0;
    const bv = Number(b[i]) || 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return Math.max(-1, Math.min(1, dot / (Math.sqrt(normA) * Math.sqrt(normB))));
}

async function findScholarshipBySourceUrl(repo, sourceUrl) {
  if (!sourceUrl) return null;
  return repo.findScholarshipBySourceUrl(sourceUrl);
}

async function findScholarshipByTitleAndOrganization(repo, title, organizationName) {
  if (!title || !organizationName) return null;
  return repo.findScholarshipByTitleAndOrganization(title, organizationName);
}

async function findEmbeddingCandidates(repo, embedding, limit = 8) {
  if (!Array.isArray(embedding) || !embedding.length) return [];
  return repo.findSimilarScholarshipsByEmbedding(embedding, limit);
}

function buildDuplicateResult({ match, confidence, reasons, isDuplicate }) {
  return {
    isDuplicate: Boolean(isDuplicate),
    confidence: Number(confidence || 0),
    matchedScholarshipId: match ? match.id : null,
    reasons: reasons || [],
  };
}

function formatDeadlineMatch(candidateDeadline, incomingDeadline) {
  const normalizedCandidate = normalizeDate(candidateDeadline);
  const normalizedIncoming = normalizeDate(incomingDeadline);
  return normalizedCandidate && normalizedIncoming && normalizedCandidate === normalizedIncoming;
}

async function detectDuplicateScholarship({
  title,
  organizationName,
  applicationUrl,
  sourceUrl,
  deadline,
  embedding,
}) {
  const repo = new ScholarshipRepository();
  const reasons = [];

  const candidateUrl = normalizeUrl(applicationUrl || sourceUrl);
  const exactUrlRow = candidateUrl ? await findScholarshipBySourceUrl(repo, candidateUrl) : null;
  if (exactUrlRow) {
    reasons.push("Same official URL detected as existing scholarship");
    if (formatDeadlineMatch(exactUrlRow.deadline, deadline)) {
      reasons.push("Deadline also matches existing scholarship");
    }
    return buildDuplicateResult({
      match: exactUrlRow,
      confidence: 1.0,
      isDuplicate: true,
      reasons,
    });
  }

  const exactTitleRow = await findScholarshipByTitleAndOrganization(repo, title, organizationName);
  if (exactTitleRow) {
    reasons.push("Same title and university detected");
    if (formatDeadlineMatch(exactTitleRow.deadline, deadline)) {
      reasons.push("Deadline also matches existing scholarship");
    }
    return buildDuplicateResult({
      match: exactTitleRow,
      confidence: 0.95,
      isDuplicate: true,
      reasons,
    });
  }

  if (!Array.isArray(embedding) || !embedding.length) {
    return buildDuplicateResult({ isDuplicate: false, confidence: 0, reasons: [] });
  }

  const candidates = await findEmbeddingCandidates(repo, embedding, 10);
  let bestMatch = null;
  let bestSimilarity = 0;

  for (const candidate of candidates) {
    const candidateEmbedding = parseEmbedding(candidate.embedding);
    const similarity = cosineSimilarity(embedding, candidateEmbedding);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = candidate;
    }
  }

  if (!bestMatch) {
    return buildDuplicateResult({ isDuplicate: false, confidence: 0, reasons: [] });
  }

  if (bestSimilarity >= 0.92) {
    reasons.push(`High semantic similarity (${bestSimilarity.toFixed(2)})`);
    if (formatDeadlineMatch(bestMatch.deadline, deadline)) {
      reasons.push("Deadline matches a semantically similar scholarship");
    }
    return buildDuplicateResult({
      match: bestMatch,
      confidence: Number(bestSimilarity.toFixed(4)),
      isDuplicate: true,
      reasons,
    });
  }

  if (bestSimilarity >= 0.82) {
    reasons.push(`Possible semantic duplicate (${bestSimilarity.toFixed(2)})`);
    if (formatDeadlineMatch(bestMatch.deadline, deadline)) {
      reasons.push("Deadline matches a semantically similar scholarship");
    }
    return buildDuplicateResult({
      match: bestMatch,
      confidence: Number(bestSimilarity.toFixed(4)),
      isDuplicate: false,
      reasons,
    });
  }

  return buildDuplicateResult({ isDuplicate: false, confidence: Number(bestSimilarity.toFixed(4)), reasons: [] });
}

module.exports = {
  detectDuplicateScholarship,
  normalizeText,
  normalizeUrl,
  cosineSimilarity,
};