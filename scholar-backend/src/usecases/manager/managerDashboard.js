const { query } = require("../../infra/db/neonClient");

async function getScholarshipsByStatus(managerId) {
  const result = await query(
    `SELECT status, COUNT(*)::int AS count
     FROM scholarships
     WHERE posted_by_user_id = $1
     GROUP BY status`,
    [managerId]
  );

  const byStatus = {
    pending: 0,
    verified: 0,
    expired: 0,
  };

  for (const row of result.rows) {
    if (byStatus[row.status] != null) {
      byStatus[row.status] = Number(row.count);
    }
  }

  return byStatus;
}

async function getApplicationsByStatus(managerId) {
  const result = await query(
    `SELECT a.status, COUNT(*)::int AS count
     FROM applications a
     INNER JOIN scholarships s ON s.id = a.scholarship_id
     WHERE s.posted_by_user_id = $1
     GROUP BY a.status`,
    [managerId]
  );

  const byStatus = {
    pending: 0,
    submitted: 0,
    accepted: 0,
    rejected: 0,
  };

  for (const row of result.rows) {
    if (byStatus[row.status] != null) {
      byStatus[row.status] = Number(row.count);
    }
  }

  return byStatus;
}

async function getManagerStatistics(managerId) {
  const [scholarshipsTotalResult, scholarshipsByStatus, applicationsTotalResult, applicationsByStatus] =
    await Promise.all([
      query("SELECT COUNT(*)::int AS total FROM scholarships WHERE posted_by_user_id = $1", [managerId]),
      getScholarshipsByStatus(managerId),
      query(
        `SELECT COUNT(*)::int AS total
         FROM applications a
         INNER JOIN scholarships s ON s.id = a.scholarship_id
         WHERE s.posted_by_user_id = $1`,
        [managerId]
      ),
      getApplicationsByStatus(managerId),
    ]);

  return {
    totalScholarshipsPosted: Number(scholarshipsTotalResult.rows[0]?.total || 0),
    scholarshipsByStatus,
    totalApplicationsReceived: Number(applicationsTotalResult.rows[0]?.total || 0),
    applicationsByStatus,
  };
}

async function getManagerScholarships(managerId) {
  const result = await query(
    `SELECT s.id,
            s.title,
            s.status,
            s.country,
            s.degree_level,
            s.deadline,
            s.created_at,
            (SELECT COUNT(*)::int FROM applications a WHERE a.scholarship_id = s.id) AS applications_count,
            (SELECT COUNT(*)::int FROM bookmarks b WHERE b.scholarship_id = s.id) AS bookmark_count
     FROM scholarships s
     WHERE s.posted_by_user_id = $1
     ORDER BY s.created_at DESC`,
    [managerId]
  );

  return result.rows;
}

async function getManagerScholarshipAnalytics(managerId, scholarshipId) {
  const scholarshipResult = await query(
    `SELECT id, title, status, deadline, created_at
     FROM scholarships
     WHERE id = $1 AND posted_by_user_id = $2
     LIMIT 1`,
    [scholarshipId, managerId]
  );

  const scholarship = scholarshipResult.rows[0];
  if (!scholarship) {
    const err = new Error("Scholarship not found");
    err.statusCode = 404;
    throw err;
  }

  const [applicationsTotalResult, applicationsByStatusResult, bookmarksResult] = await Promise.all([
    query(
      "SELECT COUNT(*)::int AS total FROM applications WHERE scholarship_id = $1",
      [scholarshipId]
    ),
    query(
      "SELECT status, COUNT(*)::int AS count FROM applications WHERE scholarship_id = $1 GROUP BY status",
      [scholarshipId]
    ),
    query("SELECT COUNT(*)::int AS total FROM bookmarks WHERE scholarship_id = $1", [scholarshipId]),
  ]);

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

  return {
    scholarship: {
      id: scholarship.id,
      title: scholarship.title,
      status: scholarship.status,
      deadline: scholarship.deadline,
      createdAt: scholarship.created_at,
    },
    metrics: {
      totalApplications: Number(applicationsTotalResult.rows[0]?.total || 0),
      applicationsByStatus,
      totalBookmarks: Number(bookmarksResult.rows[0]?.total || 0),
    },
  };
}

async function getManagerDashboard(managerId) {
  const [statistics, upcomingDeadlinesResult, mostViewedResult, recentScholarshipsResult, recentApplicationsResult] =
    await Promise.all([
      getManagerStatistics(managerId),
      query(
        `SELECT id, title, deadline, status
         FROM scholarships
         WHERE posted_by_user_id = $1
           AND deadline IS NOT NULL
           AND deadline >= CURRENT_DATE
         ORDER BY deadline ASC
         LIMIT 5`,
        [managerId]
      ),
      query(
        `SELECT s.id,
                s.title,
                COUNT(b.id)::int AS views
         FROM scholarships s
         LEFT JOIN bookmarks b ON b.scholarship_id = s.id
         WHERE s.posted_by_user_id = $1
         GROUP BY s.id, s.title
         ORDER BY views DESC, s.title ASC
         LIMIT 5`,
        [managerId]
      ),
      query(
        `SELECT title, created_at
         FROM scholarships
         WHERE posted_by_user_id = $1
         ORDER BY created_at DESC
         LIMIT 3`,
        [managerId]
      ),
      query(
        `SELECT s.title, a.status, a.created_at
         FROM applications a
         INNER JOIN scholarships s ON s.id = a.scholarship_id
         WHERE s.posted_by_user_id = $1
         ORDER BY a.created_at DESC
         LIMIT 3`,
        [managerId]
      ),
    ]);

  const recentActivity = [
    ...recentScholarshipsResult.rows.map((row) => ({
      type: "scholarship_created",
      message: `Posted scholarship "${row.title}"`,
      at: row.created_at,
    })),
    ...recentApplicationsResult.rows.map((row) => ({
      type: "application_update",
      message: `New ${row.status} application for "${row.title}"`,
      at: row.created_at,
    })),
  ]
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 6);

  return {
    statistics,
    upcomingDeadlines: upcomingDeadlinesResult.rows,
    mostViewedScholarships: mostViewedResult.rows,
    recentActivity,
  };
}

module.exports = {
  getManagerDashboard,
  getManagerScholarships,
  getManagerScholarshipAnalytics,
  getManagerStatistics,
};

