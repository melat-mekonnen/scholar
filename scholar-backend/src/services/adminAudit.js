const { AdminAuditLogRepository } = require("../repositories/AdminAuditLogRepository");

const auditRepo = new AdminAuditLogRepository();

/**
 * Best-effort admin activity logging.
 * This should never break user-facing flows if the audit table is missing or unavailable.
 */
async function logAdminAction(actor, action, targetType, targetId, metadata) {
  if (!actor || actor.role !== "admin" || !actor.id || !action) return;
  try {
    await auditRepo.create({
      actorUserId: actor.id,
      action,
      targetType,
      targetId,
      metadata,
    });
  } catch {
    // Intentionally swallow logging errors to avoid impacting existing workflows.
  }
}

module.exports = { logAdminAction };
