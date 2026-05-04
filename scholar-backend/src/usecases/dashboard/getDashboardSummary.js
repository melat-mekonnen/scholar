const { ScholarshipRepository } = require("../../repositories/ScholarshipRepository");
const { UserActivityRepository } = require("../../repositories/UserActivityRepository");
const { StudentProfileRepository } = require("../../repositories/StudentProfileRepository");
const { getRecommendations } = require("../recommendations/getRecommendations");

const scholarshipRepo = new ScholarshipRepository();
const activityRepo = new UserActivityRepository();
const profileRepo = new StudentProfileRepository();

async function getDashboardSummary(userId) {
  let bestMatches = [];
  try {
    const aiRecs = await getRecommendations({ userId, topN: 3 });
    bestMatches = aiRecs.results.map((r) => ({
      id: r.scholarship.id,
      title: r.scholarship.title,
      country: r.scholarship.country,
      deadline: r.scholarship.deadline,
      applicationUrl: r.scholarship.application_url,
      explanation: r.explanation || null, // Will be populated by AI service
    }));
  } catch (error) {
    console.error("AI Recommendations failed, falling back:", error.message);
    const recommended = await scholarshipRepo.getDefaultRecommended(3);
    bestMatches = recommended.map((s) => ({
      id: s.id,
      title: s.title,
      country: s.country,
      deadline: s.deadline,
      applicationUrl: s.application_url,
      explanation: "Recommended scholarship",
    }));
  }

  // Urgent Deadlines
  const urgent = await scholarshipRepo.getUrgentDeadlines(3);
  const urgentDeadlines = urgent.map((s) => ({
    id: s.id,
    title: s.title,
    country: s.country,
    deadline: s.deadline,
    applicationUrl: s.application_url,
  }));

  // Trending
  const trending = await scholarshipRepo.getTrending(3);
  const trendingOpportunities = trending.map((s) => ({
    id: s.id,
    title: s.title,
    country: s.country,
    deadline: s.deadline,
    applicationUrl: s.application_url,
  }));

  // Recent activity from DB
  const recentActivityRows = await activityRepo.getRecentByUserId(userId, 3);

  // Profile completeness
  const profile = await profileRepo.findByUserId(userId);
  const completenessScore = profile?.completeness_score || 0;

  // For now, stub stats with fixed values.
  const stats = {
    activeApplications: 12,
    savedScholarships: 8,
    recommendedMatches: bestMatches.length,
    upcomingDeadlines: urgentDeadlines.length,
    completenessScore,
  };

  return {
    stats,
    bestMatches,
    urgentDeadlines,
    trendingOpportunities,
    recentActivity: recentActivityRows.map((a) => a.description),
  };
}

module.exports = { getDashboardSummary };

