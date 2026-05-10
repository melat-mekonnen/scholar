const { UserRepository } = require("../repositories/UserRepository");

const MAX_FREE_AI_REQUESTS = 5;
const userRepo = new UserRepository();

function isPremiumActive(user) {
  return (
    user?.plan_type === "premium" &&
    user?.subscription_status === "active"
  );
}

function normalizeAiUsage(user) {
  const now = new Date();
  const resetAt = user.ai_requests_reset_at ? new Date(user.ai_requests_reset_at) : new Date(0);
  const aiRequestsToday = resetAt <= now ? 0 : Number(user.ai_requests_today || 0);
  const aiRequestsRemaining = isPremiumActive(user)
    ? Number.POSITIVE_INFINITY
    : Math.max(0, MAX_FREE_AI_REQUESTS - aiRequestsToday);

  return {
    planType: user.plan_type || "free",
    subscriptionStatus: user.subscription_status || "active",
    isPremium: isPremiumActive(user),
    aiRequestsToday,
    aiRequestsRemaining,
    aiRequestsLimit: MAX_FREE_AI_REQUESTS,
    aiRequestsResetAt: resetAt.toISOString(),
  };
}

async function enforceFreeTierLimits(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await userRepo.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const subscription = normalizeAiUsage(user);
    req.subscription = subscription;

    if (!subscription.isPremium && subscription.aiRequestsRemaining <= 0) {
      return res.status(429).json({
        message:
          "Free AI recommendations limit reached for today. Upgrade to Premium for unlimited access.",
        planType: subscription.planType,
        aiRequestsToday: subscription.aiRequestsToday,
        aiRequestsLimit: subscription.aiRequestsLimit,
        aiRequestsResetAt: subscription.aiRequestsResetAt,
      });
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

async function requirePremium(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await userRepo.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!isPremiumActive(user)) {
      return res.status(403).json({
        message:
          "Premium plan required. Upgrade your subscription to access this feature.",
      });
    }

    req.subscription = normalizeAiUsage(user);
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { enforceFreeTierLimits, requirePremium };
