const { BookmarkRepository } = require("../repositories/BookmarkRepository");
const { UserRepository } = require("../repositories/UserRepository");

const MAX_FREE_AI_REQUESTS = 5;
const MAX_FREE_BOOKMARKS = 20;

const userRepo = new UserRepository();
const bookmarkRepo = new BookmarkRepository();

function isPremiumActive(user) {
  return (
    user?.plan_type === "premium" &&
    user?.subscription_status === "active"
  );
}

function computeAiUsage(user) {
  const now = new Date();
  const resetAt = user?.ai_requests_reset_at ? new Date(user.ai_requests_reset_at) : new Date(0);
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

async function getSubscriptionInfo(userId) {
  const user = await userRepo.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return computeAiUsage(user);
}

async function incrementAiRequest(userId) {
  const result = await userRepo.incrementAiRequests(userId);
  if (!result) {
    const err = new Error("Unable to update AI usage");
    err.statusCode = 500;
    throw err;
  }
  return computeAiUsage(result);
}

async function checkBookmarkAccess(userId) {
  const user = await userRepo.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const isPremium = isPremiumActive(user);
  const count = await bookmarkRepo.countByUser(userId);
  const remaining = MAX_FREE_BOOKMARKS - count;

  return {
    planType: user.plan_type || "free",
    subscriptionStatus: user.subscription_status || "active",
    isPremium,
    count,
    remaining,
    maxFreeBookmarks: MAX_FREE_BOOKMARKS,
    canSave: isPremium || count < MAX_FREE_BOOKMARKS,
  };
}

module.exports = {
  getSubscriptionInfo,
  incrementAiRequest,
  checkBookmarkAccess,
  isPremiumActive,
};
