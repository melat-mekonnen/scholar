const { ScholarshipRepository } = require("../repositories/ScholarshipRepository");

/**
 * Owner dashboard — org-level entry (operational scholarship tools stay on /api/manager).
 */
async function dashboard(req, res, next) {
  try {
    const repo = new ScholarshipRepository();
    const stats = await repo.getStats();

    return res.json({
      role: "owner",
      userId: req.user?.id,
      message:
        "Owner workspace. Use Manager tools for day-to-day scholarship operations; full governance APIs will expand in later milestones.",
      totals: {
        scholarships: stats.total_scholarships,
        pendingApprovals: stats.pending_approvals,
        verifiedSources: stats.verified_sources,
        suspiciousSources: stats.suspicious_sources,
        discoverySuccessRate: 94 // Keep crawler rate static for now as requested
      },
      links: {
        managerDashboard: "/api/manager/dashboard",
        managerScholarships: "/api/manager/scholarships",
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  dashboard,
};
