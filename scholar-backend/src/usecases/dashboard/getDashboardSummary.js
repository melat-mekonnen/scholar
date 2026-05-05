const { ScholarshipRepository } = require("../../repositories/ScholarshipRepository");
const { UserActivityRepository } = require("../../repositories/UserActivityRepository");
const { query } = require("../../infra/db/neonClient");

const scholarshipRepo = new ScholarshipRepository();
const activityRepo = new UserActivityRepository();

async function getDashboardSummary(userId) {
  // Recommended scholarships from DB
  const recommended = await scholarshipRepo.getDefaultRecommended(3);

  // Recent activity from DB
  const recentActivityRows = await activityRepo.getRecentByUserId(userId, 3);

  const [activeAppsRes, savedRes, recommendedMatchesRes, upcomingRes] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS total
       FROM applications
       WHERE user_id = $1
         AND status IN ('saved', 'preparing', 'submitted')`,
      [userId],
    ),
    query(`SELECT COUNT(*)::int AS total FROM bookmarks WHERE user_id = $1`, [userId]),
    query(
      `SELECT COUNT(*)::int AS total
       FROM scholarships
       WHERE status = 'verified'
         AND (deadline IS NULL OR deadline >= CURRENT_DATE)`,
      [],
    ),
    query(
      `SELECT COUNT(*)::int AS total
       FROM applications a
       INNER JOIN scholarships s ON s.id = a.scholarship_id
       WHERE a.user_id = $1
         AND s.deadline IS NOT NULL
         AND s.deadline >= CURRENT_DATE
         AND s.deadline <= (CURRENT_DATE + INTERVAL '30 days')`,
      [userId],
    ),
  ]);

  const stats = {
    activeApplications: Number(activeAppsRes.rows[0]?.total || 0),
    savedScholarships: Number(savedRes.rows[0]?.total || 0),
    recommendedMatches: Number(recommendedMatchesRes.rows[0]?.total || 0),
    upcomingDeadlines: Number(upcomingRes.rows[0]?.total || 0),
  };

  return {
    stats,
    recommendedScholarships: recommended.map((s) => ({
      id: s.id,
      title: s.title,
      country: s.country,
      deadline: s.deadline,
      applicationUrl: s.application_url,
    })),
    recentActivity: recentActivityRows.map((a) => a.description),
  };
}

module.exports = { getDashboardSummary };

