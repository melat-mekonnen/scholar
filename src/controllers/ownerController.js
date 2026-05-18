/**
 * Owner dashboard — org-level entry (operational scholarship tools stay on /api/manager).
 */
async function dashboard(req, res, next) {
  try {
    return res.json({
      role: "owner",
      userId: req.user?.id,
      message:
        "Owner workspace. Use Manager tools for day-to-day scholarship operations; full governance APIs will expand in later milestones.",
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
