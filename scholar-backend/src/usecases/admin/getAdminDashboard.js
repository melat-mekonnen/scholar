const { query } = require("../../infra/db/neonClient");

async function getAdminDashboard() {
  // Users totals
  const usersTotalResult = await query(
    "SELECT COUNT(*) AS total FROM users",
    []
  );
  const usersByRoleResult = await query(
    "SELECT role, COUNT(*) AS count FROM users GROUP BY role",
    []
  );

  const usersByRole = {};
  for (const row of usersByRoleResult.rows) {
    usersByRole[row.role] = Number(row.count);
  }

  // Scholarships totals
  const scholarshipsTotalResult = await query(
    "SELECT COUNT(*) AS total FROM scholarships",
    []
  );
  const scholarshipsVerifiedResult = await query(
    "SELECT COUNT(*) AS count FROM scholarships WHERE status = 'verified'",
    []
  );
  const scholarshipsPendingResult = await query(
    "SELECT COUNT(*) AS count FROM scholarships WHERE status = 'pending'",
    []
  );

  // Applications totals
  const applicationsTotalResult = await query(
    "SELECT COUNT(*) AS total FROM applications",
    []
  );
  const applicationsByStatusResult = await query(
    "SELECT status, COUNT(*) AS count FROM applications GROUP BY status",
    []
  );

  const applicationsByStatus = {
    pending: 0,
    submitted: 0,
    accepted: 0,
    rejected: 0,
  };
  for (const row of applicationsByStatusResult.rows) {
    if (applicationsByStatus[row.status] != null) {
      applicationsByStatus[row.status] = Number(row.count);
    }
  }

  // For now, use simple stubbed trends; can be replaced with real time-series queries.
  const activity = {
    userGrowth: [
      { date: "2026-01-01", count: 150 },
      { date: "2026-02-01", count: 200 },
    ],
    scholarshipTrends: [
      { month: "2026-01", count: 20 },
      { month: "2026-02", count: 35 },
    ],
  };

  return {
    totals: {
      users: {
        total: Number(usersTotalResult.rows[0]?.total || 0),
        byRole: usersByRole,
      },
      scholarships: {
        total: Number(scholarshipsTotalResult.rows[0]?.total || 0),
        verified: Number(scholarshipsVerifiedResult.rows[0]?.count || 0),
        pending: Number(scholarshipsPendingResult.rows[0]?.count || 0),
      },
      applications: {
        total: Number(applicationsTotalResult.rows[0]?.total || 0),
        byStatus: applicationsByStatus,
      },
    },
    activity,
  };
}

module.exports = { getAdminDashboard };

