const { SubscriptionRepository } = require("../../repositories/SubscriptionRepository");
const { AiChatUsageRepository } = require("../../repositories/AiChatUsageRepository");
const { isProActive } = require("./isProActive");
const { roleBypassesQuota } = require("./checkAiChatQuota");
const { getUsageDateString } = require("./usageDate");

const subscriptionRepo = new SubscriptionRepository();
const usageRepo = new AiChatUsageRepository();

/**
 * Record one AI chat request for free users (daily bucket).
 * No-op for Pro, expired Pro treated as free, and bypass roles.
 */
async function consumeAiChatQuota(userId) {
  const row = await subscriptionRepo.getByUserId(userId);
  if (!row) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (roleBypassesQuota(row.role) || isProActive(row)) {
    return { consumed: false, used: null, usageDate: getUsageDateString() };
  }

  const usageDate = getUsageDateString();
  const used = await usageRepo.increment(userId, usageDate);
  return { consumed: true, used, usageDate };
}

module.exports = { consumeAiChatQuota };
