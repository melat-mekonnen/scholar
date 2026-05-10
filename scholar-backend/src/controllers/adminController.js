const { getAdminDashboard, getAdminStatistics } = require("../usecases/admin/getAdminDashboard");
const { getAdminAnalytics } = require("../usecases/admin/getAdminAnalytics");
const { listUsers } = require("../usecases/users/userUsecases");
const { AdminAuditLogRepository } = require("../repositories/AdminAuditLogRepository");
const { logAdminAction } = require("../services/adminAudit");
const { DiscoveryRepository } = require("../repositories/DiscoveryRepository");
const { runDiscoveryPipeline } = require("../services/discoveryPipeline");
const { ScholarshipCandidateRepository } = require("../repositories/ScholarshipCandidateRepository");
const { runCandidateDiscoveryCycle } = require("../services/discovery/candidatePipelineService");
const {
  listPendingScholarships,
  listScholarships: listScholarshipsUsecase,
  getScholarshipById,
  verifyScholarship,
  rejectScholarship,
} = require("../usecases/admin/adminScholarships");

const adminAuditRepo = new AdminAuditLogRepository();
const discoveryRepo = new DiscoveryRepository();
const candidateRepo = new ScholarshipCandidateRepository();

async function getDashboard(req, res, next) {
  try {
    const data = await getAdminDashboard();
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

async function getStatistics(req, res, next) {
  try {
    const data = await getAdminStatistics();
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

async function getAnalytics(req, res, next) {
  try {
    const data = await getAdminAnalytics();
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

async function listUsersForAdmin(req, res, next) {
  try {
    const { page, pageSize, search, role } = req.query;
    const result = await listUsers(req.user, { page, pageSize, search, role });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function getAuditLogs(req, res, next) {
  try {
    const { page, pageSize, action, actorUserId, targetType } = req.query;
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedSize = pageSize ? parseInt(pageSize, 10) : 20;

    const result = await adminAuditRepo.list({
      page: parsedPage,
      pageSize: parsedSize,
      action,
      actorUserId,
      targetType,
    });
    return res.json(result);
  } catch (err) {
    // Keep the endpoint non-breaking for environments that have not run the migration yet.
    if (String(err.message || "").includes("admin_audit_logs")) {
      return res.json({ logs: [], total: 0, page: 1, pageSize: 20 });
    }
    return next(err);
  }
}

async function getPendingScholarships(req, res, next) {
  try {
    const { search } = req.query;
    const scholarships = await listPendingScholarships({ search });
    return res.json({ scholarships });
  } catch (err) {
    return next(err);
  }
}

async function listScholarships(req, res, next) {
  try {
    const { search, status } = req.query;
    const scholarships = await listScholarshipsUsecase({ search, status });
    return res.json({ scholarships });
  } catch (err) {
    return next(err);
  }
}

async function getScholarship(req, res, next) {
  try {
    const scholarship = await getScholarshipById(req.params.id);
    return res.json({
      id: scholarship.id,
      title: scholarship.title,
      country: scholarship.country,
      degreeLevel: scholarship.degree_level,
      status: scholarship.status,
      deadline: scholarship.deadline,
      fundingType: scholarship.funding_type,
      fieldOfStudy: scholarship.field_of_study,
      amount: scholarship.amount,
      description: scholarship.description,
      applicationUrl: scholarship.application_url,
      sourceName: scholarship.source_name,
      sourceUrl: scholarship.source_url,
      aiConfidence: scholarship.ai_confidence,
      discoveredAt: scholarship.discovered_at,
      rejectionReason: scholarship.rejection_reason,
      createdAt: scholarship.created_at,
      updatedAt: scholarship.updated_at,
      postedBy: scholarship.posted_by_id
        ? {
            id: scholarship.posted_by_id,
            fullName: scholarship.posted_by_full_name,
            email: scholarship.posted_by_email,
          }
        : null,
    });
  } catch (err) {
    return next(err);
  }
}

async function verify(req, res, next) {
  try {
    const updated = await verifyScholarship(req.params.id);
    await logAdminAction(req.user, "scholarship.verify", "scholarship", req.params.id, {
      status: updated.status,
    });
    return res.json({ id: updated.id, status: updated.status });
  } catch (err) {
    return next(err);
  }
}

async function reject(req, res, next) {
  try {
    const { reason } = req.body || {};
    const updated = await rejectScholarship(req.params.id, reason);
    await logAdminAction(req.user, "scholarship.reject", "scholarship", req.params.id, {
      status: updated.status,
      reason: updated.rejection_reason || null,
    });
    return res.json({
      id: updated.id,
      status: updated.status,
      rejectionReason: updated.rejection_reason,
    });
  } catch (err) {
    return next(err);
  }
}

async function listDiscoverySources(req, res, next) {
  try {
    const sources = await discoveryRepo.listSources();
    return res.json({ sources });
  } catch (err) {
    return next(err);
  }
}

async function upsertDiscoverySource(req, res, next) {
  try {
    const { sourceName, sourceType, sourceUrl, status, trustScore, isActive, metadata } = req.body || {};
    if (!sourceName || !sourceType || !sourceUrl) {
      const err = new Error("sourceName, sourceType, and sourceUrl are required");
      err.statusCode = 400;
      throw err;
    }
    if (!["rss", "sitemap", "page", "api"].includes(String(sourceType))) {
      const err = new Error("sourceType must be one of 'rss', 'sitemap', 'page', or 'api'");
      err.statusCode = 400;
      throw err;
    }

    const source = await discoveryRepo.createSource({
      name: String(sourceName).trim(),
      sourceType: String(sourceType).trim(),
      url: String(sourceUrl).trim(),
      status: status ? String(status).trim() : "pending",
      trustScore: trustScore != null ? Number(trustScore) : 0.5,
      isActive: isActive == null ? true : Boolean(isActive),
      createdBy: req.user?.id || null,
      metadata: typeof metadata === "object" && metadata !== null ? metadata : {},
    });

    await logAdminAction(req.user, "discovery.source.upsert", "scholarship_source", source.id, {
      sourceType: source.source_type,
      sourceUrl: source.url,
      status: source.status,
      trustScore: source.trust_score,
    });

    return res.status(201).json({ source });
  } catch (err) {
    return next(err);
  }
}

async function runDiscovery(req, res, next) {
  try {
    const limit = req.body?.limit ? Number(req.body.limit) : undefined;
    const result = await runDiscoveryPipeline({ limit });
    await logAdminAction(req.user, "discovery.pipeline.run", "system", null, result);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function listCandidates(req, res, next) {
  try {
    const candidates = await candidateRepo.listPendingCandidates();
    return res.json({ candidates });
  } catch (err) {
    return next(err);
  }
}

async function approveCandidate(req, res, next) {
  try {
    const moved = await candidateRepo.approveCandidateToScholarship(req.params.id);
    if (!moved) {
      const err = new Error("Candidate not found");
      err.statusCode = 404;
      throw err;
    }
    await logAdminAction(req.user, "candidate.approve", "scholarship_candidate", req.params.id, {
      scholarshipId: moved.id,
    });
    return res.json({ candidateId: req.params.id, scholarship: moved });
  } catch (err) {
    return next(err);
  }
}

async function rejectCandidate(req, res, next) {
  try {
    const updated = await candidateRepo.setCandidateStatus(req.params.id, "rejected");
    if (!updated) {
      const err = new Error("Candidate not found");
      err.statusCode = 404;
      throw err;
    }
    await logAdminAction(req.user, "candidate.reject", "scholarship_candidate", req.params.id, {});
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
}

async function runCandidateDiscovery(req, res, next) {
  try {
    const limit = req.body?.limit ? Number(req.body.limit) : undefined;
    const result = await runCandidateDiscoveryCycle({ limit });
    await logAdminAction(req.user, "candidate.discovery.run", "system", null, result);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDashboard,
  getStatistics,
  getAnalytics,
  listUsersForAdmin,
  getAuditLogs,
  listScholarships,
  getPendingScholarships,
  getScholarship,
  verify,
  reject,
  listDiscoverySources,
  upsertDiscoverySource,
  runDiscovery,
  listCandidates,
  approveCandidate,
  rejectCandidate,
  runCandidateDiscovery,
};

