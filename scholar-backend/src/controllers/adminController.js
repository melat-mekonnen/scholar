const { getAdminDashboard, getAdminStatistics } = require("../usecases/admin/getAdminDashboard");
const { listUsers, createUserByAdmin } = require("../usecases/users/userUsecases");
const { AdminAuditLogRepository } = require("../repositories/AdminAuditLogRepository");
const { logAdminAction } = require("../services/adminAudit");
const {
  listPendingScholarships,
  listScholarships: listScholarshipsUsecase,
  getScholarshipById,
  verifyScholarship,
  rejectScholarship,
  listImportRuns,
  listImportErrors,
  runImport,
  listImportSources,
  listImportSourceHealth,
} = require("../usecases/admin/adminScholarships");
const { mapAdminScholarship } = require("../utils/mapAdminScholarship");
const { ScholarshipRepository } = require("../repositories/ScholarshipRepository");

const scholarshipRepo = new ScholarshipRepository();

const adminAuditRepo = new AdminAuditLogRepository();

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

async function listUsersForAdmin(req, res, next) {
  try {
    const { page, pageSize, search, role } = req.query;
    const result = await listUsers(req.user, { page, pageSize, search, role });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const user = await createUserByAdmin(req.user, req.body || {});
    await logAdminAction(req.user, "user.create", "user", user.id, {
      role: user.role,
      email: user.email,
    });
    return res.status(201).json(user);
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
    return res.json({ scholarships: scholarships.map(mapAdminScholarship) });
  } catch (err) {
    return next(err);
  }
}

async function listScholarships(req, res, next) {
  try {
    const { search, status } = req.query;
    const scholarships = await listScholarshipsUsecase({ search, status });
    return res.json({ scholarships: scholarships.map(mapAdminScholarship) });
  } catch (err) {
    return next(err);
  }
}

async function getScholarship(req, res, next) {
  try {
    const scholarship = await getScholarshipById(req.params.id);
    return res.json(mapAdminScholarship(scholarship));
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

async function getImportRuns(req, res, next) {
  try {
    const runs = await listImportRuns({ limit: req.query.limit });
    return res.json({ runs });
  } catch (err) {
    return next(err);
  }
}

async function getImportErrors(req, res, next) {
  try {
    const errors = await listImportErrors({ limit: req.query.limit });
    return res.json({ errors });
  } catch (err) {
    return next(err);
  }
}

async function deleteScholarship(req, res, next) {
  try {
    const { id } = req.params;
    const current = await scholarshipRepo.findById(id);
    if (!current) {
      const err = new Error("Scholarship not found");
      err.statusCode = 404;
      throw err;
    }
    await scholarshipRepo.deleteScholarshipCascade(id);
    await logAdminAction(req.user, "scholarship.delete", "scholarship", id, {
      title: current.title,
    });
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function getImportSources(req, res, next) {
  try {
    const sources = listImportSources();
    return res.json({ sources });
  } catch (err) {
    return next(err);
  }
}

async function getImportHealth(req, res, next) {
  try {
    const health = await listImportSourceHealth();
    return res.json({ health });
  } catch (err) {
    return next(err);
  }
}

async function triggerImport(req, res, next) {
  try {
    const { source, publishStatus } = req.body || {};
    const result = await runImport({ source, publishStatus });
    await logAdminAction(req.user, "scholarship.import.run", "system", "scholarship-ingestion", {
      source: result.sourceName,
      fetched: result.fetched,
      upserted: result.upserted,
      failed: result.failed,
      skipped: result.skipped,
      runId: result.runId,
    });
    return res.status(201).json(result);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDashboard,
  getStatistics,
  listUsersForAdmin,
  createUser,
  getAuditLogs,
  listScholarships,
  getPendingScholarships,
  getScholarship,
  verify,
  reject,
  deleteScholarship,
  getImportRuns,
  getImportErrors,
  getImportSources,
  getImportHealth,
  triggerImport,
};

