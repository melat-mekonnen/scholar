const { getAdminDashboard, getAdminStatistics } = require("../usecases/admin/getAdminDashboard");
const { listUsers } = require("../usecases/users/userUsecases");
const { AdminAuditLogRepository } = require("../repositories/AdminAuditLogRepository");
const { logAdminAction } = require("../services/adminAudit");
const { notifyScholarshipDecision } = require("../services/scholarshipModerationNotifications");
const {
  listPendingScholarships,
  listScholarships: listScholarshipsUsecase,
  getScholarshipById,
  verifyScholarship,
  rejectScholarship,
  flagScholarship,
} = require("../usecases/admin/adminScholarships");

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
    const scholarship = await getScholarshipById(req.params.id);
    const updated = await verifyScholarship(req.params.id);
    await notifyScholarshipDecision({
      scholarshipId: req.params.id,
      ownerUserId: scholarship.posted_by_id,
      action: "verified",
    });
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
    const scholarship = await getScholarshipById(req.params.id);
    const updated = await rejectScholarship(req.params.id, reason);
    await notifyScholarshipDecision({
      scholarshipId: req.params.id,
      ownerUserId: scholarship.posted_by_id,
      action: "rejected",
      reason: updated.rejection_reason || null,
    });
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

async function flag(req, res, next) {
  try {
    const { reason } = req.body || {};
    const flag = await flagScholarship(req.params.id, req.user?.id, reason);
    await logAdminAction(req.user, "scholarship.flag", "scholarship", req.params.id, {
      reason: flag.reason || null,
    });
    return res.status(201).json({
      id: flag.id,
      scholarshipId: flag.scholarship_id,
      flaggedByUserId: flag.flagged_by_user_id,
      reason: flag.reason,
      createdAt: flag.created_at,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDashboard,
  getStatistics,
  listUsersForAdmin,
  getAuditLogs,
  listScholarships,
  getPendingScholarships,
  getScholarship,
  verify,
  reject,
  flag,
};

