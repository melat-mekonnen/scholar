const { query } = require("../../infra/db/neonClient");
const { ScholarshipRepository } = require("../../repositories/ScholarshipRepository");
const { UserActivityRepository } = require("../../repositories/UserActivityRepository");
const { mapPublicScholarship } = require("../../utils/mapPublicOpportunity");

const scholarshipRepo = new ScholarshipRepository();
const activityRepo = new UserActivityRepository();

async function getDashboardStats(userId) {
  const [applicationsRes, bookmarksRes, upcomingRes, featuredRes] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS total
       FROM applications
       WHERE user_id = $1
         AND status IN ('pending', 'submitted', 'accepted')`,
      [userId]
    ),
    query(
      `SELECT COUNT(*)::int AS total
       FROM bookmarks b
       INNER JOIN scholarships s ON s.id = b.scholarship_id
       WHERE b.user_id = $1 AND s.status = 'verified'`,
      [userId]
    ),
    query(
      `SELECT COUNT(DISTINCT s.id)::int AS total
       FROM scholarships s
       LEFT JOIN bookmarks b ON b.scholarship_id = s.id AND b.user_id = $1
       LEFT JOIN applications a ON a.scholarship_id = s.id AND a.user_id = $1
       WHERE s.status = 'verified'
         AND s.deadline IS NOT NULL
         AND s.deadline >= CURRENT_DATE
         AND s.deadline <= CURRENT_DATE + INTERVAL '30 days'
         AND (b.id IS NOT NULL OR a.id IS NOT NULL)`,
      [userId]
    ),
    query(
      `SELECT COUNT(*)::int AS total
       FROM scholarships
       WHERE is_recommended_default = TRUE
         AND status = 'verified'
         AND (deadline IS NULL OR deadline >= CURRENT_DATE)`,
      []
    ),
  ]);

  const activeApplications = applicationsRes.rows[0]?.total ?? 0;
  const savedScholarships = bookmarksRes.rows[0]?.total ?? 0;
  const upcomingDeadlines = upcomingRes.rows[0]?.total ?? 0;
  const featuredCount = featuredRes.rows[0]?.total ?? 0;

  return {
    activeApplications,
    savedScholarships,
    recommendedMatches: featuredCount > 0 ? featuredCount : savedScholarships,
    upcomingDeadlines,
  };
}

async function getDashboardSummary(userId, lang = "en") {
  let recommended = await scholarshipRepo.getDefaultRecommended(3);
  let usingFeatured = recommended.length > 0;

  if (recommended.length === 0) {
    recommended = await scholarshipRepo.getUpcomingVerified(3);
  }

  const loggedActivity = await activityRepo.getRecentByUserId(userId, 3);
  let recentActivity = loggedActivity.map((a) => a.description);

  if (recentActivity.length === 0) {
    const derived = await activityRepo.getDerivedRecent(userId, 3);
    recentActivity = derived.map((a) => a.description);
  }

  const stats = await getDashboardStats(userId);

  return {
    stats,
    recommendedScholarships: recommended.map((s) => {
      const mapped = mapPublicScholarship(s, lang);
      return {
        id: mapped.id,
        title: mapped.title,
        organizationName: mapped.organizationName,
        country: mapped.country,
        deadline: mapped.deadline,
        applicationUrl: mapped.applicationUrl,
      };
    }),
    recentActivity,
    meta: {
      recommendedSource: usingFeatured ? "featured" : recommended.length > 0 ? "upcoming" : "none",
    },
  };
}

module.exports = { getDashboardSummary };
