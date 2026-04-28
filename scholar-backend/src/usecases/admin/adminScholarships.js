const { AdminScholarshipRepository } = require("../../repositories/AdminScholarshipRepository");

const repo = new AdminScholarshipRepository();

const TRUSTED_SOURCE_HINTS = [".edu", ".gov", "un.org", "unesco.org", "daad.de", "chevening.org"];
const RISK_PATTERNS = [
  "guaranteed scholarship",
  "pay fee to apply",
  "processing fee",
  "wire transfer",
  "urgent payment",
  "limited slots pay now",
  "100% guaranteed",
];

function normalizeText(input) {
  return String(input || "").trim().toLowerCase();
}

function tokenize(input) {
  return new Set(
    normalizeText(input)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2)
  );
}

function jaccardSimilarity(a, b) {
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union ? intersection / union : 0;
}

function assessSource(applicationUrl) {
  if (!applicationUrl) {
    return {
      sourceStatus: "missing",
      sourceDomain: null,
      penalty: 20,
      reason: "Missing source URL",
    };
  }

  try {
    const parsed = new URL(applicationUrl);
    const host = normalizeText(parsed.hostname);
    const trusted = TRUSTED_SOURCE_HINTS.some((hint) => host.includes(hint));
    if (trusted) {
      return { sourceStatus: "trusted", sourceDomain: host, penalty: 0, reason: null };
    }
    return {
      sourceStatus: "untrusted",
      sourceDomain: host,
      penalty: 15,
      reason: `Untrusted source domain (${host})`,
    };
  } catch (_err) {
    return {
      sourceStatus: "invalid",
      sourceDomain: null,
      penalty: 20,
      reason: "Invalid source URL",
    };
  }
}

function assessDeadline(deadline) {
  if (!deadline) {
    return {
      deadlineStatus: "missing",
      penalty: 20,
      reason: "Missing deadline",
    };
  }
  const dt = new Date(deadline);
  if (Number.isNaN(dt.getTime())) {
    return {
      deadlineStatus: "invalid",
      penalty: 20,
      reason: "Invalid deadline format",
    };
  }
  if (dt.getTime() < Date.now()) {
    return {
      deadlineStatus: "expired",
      penalty: 30,
      reason: "Deadline already expired",
    };
  }
  return { deadlineStatus: "active", penalty: 0, reason: null };
}

function assessContent(title, description) {
  const content = normalizeText(`${title} ${description || ""}`);
  const hits = RISK_PATTERNS.filter((pattern) => content.includes(pattern));
  return {
    matches: hits,
    penalty: Math.min(40, hits.length * 20),
  };
}

function assessDuplicate(scholarship, candidates) {
  const base = `${scholarship.title} ${scholarship.description || ""}`;
  let best = { id: null, title: null, similarity: 0 };

  for (const candidate of candidates) {
    if (String(candidate.id) === String(scholarship.id)) continue;
    const compare = `${candidate.title} ${candidate.description || ""}`;
    const similarity = jaccardSimilarity(base, compare);
    if (similarity > best.similarity) {
      best = { id: candidate.id, title: candidate.title, similarity };
    }
  }

  const isLikelyDuplicate = best.similarity >= 0.72;
  return {
    isLikelyDuplicate,
    bestMatch: best.similarity > 0 ? best : null,
    penalty: isLikelyDuplicate ? 30 : 0,
  };
}

function buildAiReport(scholarship, candidates) {
  const source = assessSource(scholarship.application_url);
  const deadline = assessDeadline(scholarship.deadline);
  const content = assessContent(scholarship.title, scholarship.description);
  const duplicate = assessDuplicate(scholarship, candidates);

  const reasons = [];
  if (source.reason) reasons.push(source.reason);
  if (deadline.reason) reasons.push(deadline.reason);
  if (content.matches.length) {
    reasons.push(`Suspicious phrases: ${content.matches.join(", ")}`);
  }
  if (duplicate.isLikelyDuplicate) {
    reasons.push(
      `Possible duplicate with "${duplicate.bestMatch?.title || "another scholarship"}" (similarity ${Math.round(
        (duplicate.bestMatch?.similarity || 0) * 100
      )}%)`
    );
  }

  const riskScore = Math.min(
    100,
    source.penalty + deadline.penalty + content.penalty + duplicate.penalty
  );
  const riskLevel = riskScore >= 71 ? "high" : riskScore >= 31 ? "medium" : "low";
  const aiStatus =
    riskLevel === "high"
      ? "needs_manual_review"
      : riskLevel === "medium"
      ? "review_recommended"
      : "clear";

  return {
    title: scholarship.title,
    sourceStatus: source.sourceStatus,
    sourceDomain: source.sourceDomain,
    deadlineStatus: deadline.deadlineStatus,
    riskScore,
    riskLevel,
    reasons,
    duplicate: {
      detected: duplicate.isLikelyDuplicate,
      bestMatch: duplicate.bestMatch,
    },
    aiStatus,
    finalDecision:
      aiStatus === "needs_manual_review" ? "manual_review_required" : "admin_decision_required",
  };
}

async function attachAiReports(scholarships) {
  const candidates = await repo.listForVerificationSignals();
  return scholarships.map((scholarship) => ({
    ...scholarship,
    aiVerification: buildAiReport(scholarship, candidates),
  }));
}

async function listScholarships({ search, status }) {
  const scholarships = await repo.list({ search, status });
  return attachAiReports(scholarships);
}

async function listPendingScholarships({ search }) {
  const scholarships = await repo.listPending({ search });
  return attachAiReports(scholarships);
}

async function getScholarshipById(id) {
  const scholarship = await repo.findById(id);
  if (!scholarship) {
    const err = new Error("Scholarship not found");
    err.statusCode = 404;
    throw err;
  }
  return scholarship;
}

async function verifyScholarship(id) {
  const updated = await repo.updateStatus(id, "verified", null);
  if (!updated) {
    const err = new Error("Scholarship not found");
    err.statusCode = 404;
    throw err;
  }
  return updated;
}

async function analyzeScholarshipVerification(id) {
  const scholarship = await repo.findById(id);
  if (!scholarship) {
    const err = new Error("Scholarship not found");
    err.statusCode = 404;
    throw err;
  }
  const candidates = await repo.listForVerificationSignals();
  return buildAiReport(scholarship, candidates);
}

async function rejectScholarship(id, reason) {
  const updated = await repo.updateStatus(id, "rejected", reason || null);
  if (!updated) {
    const err = new Error("Scholarship not found");
    err.statusCode = 404;
    throw err;
  }
  return updated;
}

module.exports = {
  listScholarships,
  listPendingScholarships,
  getScholarshipById,
  analyzeScholarshipVerification,
  verifyScholarship,
  rejectScholarship,
};

