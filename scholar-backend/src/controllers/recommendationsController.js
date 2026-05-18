const { getRecommendations } = require("../usecases/recommendations/getRecommendations");
const { RecommendationFeedbackRepository } = require("../repositories/RecommendationFeedbackRepository");
const { incrementAiRequest } = require("../services/subscriptionService");

const feedbackRepo = new RecommendationFeedbackRepository();
const ALLOWED_INTERACTIONS = ['viewed', 'clicked', 'saved', 'dismissed', 'applied'];

async function list(req, res, next) {
  try {
    const userId = req.user?.id;
    const topN = req.query?.topN ? Number(req.query.topN) : 20;
    const q = req.query?.q || "";
    req.observabilityEvent = "recommendation_fetch";
    const subscriptionUsage = await incrementAiRequest(userId);
    const data = await getRecommendations({
      userId,
      topN,
      q,
      isPremium: subscriptionUsage.isPremium,
    });
    return res.json({
      ...data,
      planType: subscriptionUsage.planType,
      subscriptionStatus: subscriptionUsage.subscriptionStatus,
      aiRequestsToday: subscriptionUsage.aiRequestsToday,
      aiRequestsLimit: subscriptionUsage.aiRequestsLimit,
      aiRequestsRemaining: subscriptionUsage.aiRequestsRemaining,
      aiRequestsResetAt: subscriptionUsage.aiRequestsResetAt,
    });
  } catch (err) {
    return next(err);
  }
}

async function logFeedback(req, res, next) {
  try {
    const userId = req.user?.id;
    const { scholarshipId, interactionType } = req.body;

    if (!scholarshipId || !interactionType) {
      return res.status(400).json({ message: "scholarshipId and interactionType are required" });
    }

    if (!ALLOWED_INTERACTIONS.includes(interactionType)) {
      return res.status(400).json({ message: "Invalid interactionType" });
    }

    const result = await feedbackRepo.logInteraction(userId, scholarshipId, interactionType);
    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { list, logFeedback };

