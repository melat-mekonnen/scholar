const { ScholarshipRepository } = require("../../repositories/ScholarshipRepository");
const { UserActivityRepository } = require("../../repositories/UserActivityRepository");

const scholarshipRepo = new ScholarshipRepository();
const activityRepo = new UserActivityRepository();

async function getDashboardSummary(userId) {
  // Recommended scholarships from DB
  const recommended = await scholarshipRepo.getDefaultRecommended(3);

  // Recent activity from DB
  const recentActivityRows = await activityRepo.getRecentByUserId(userId, 3);

  // For now, stub stats with fixed values.
  const stats = {
    activeApplications: 12,
    savedScholarships: 8,
    recommendedMatches: 5,
    upcomingDeadlines: 3,
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

