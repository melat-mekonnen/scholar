const { SubscriptionRepository } = require("../../repositories/SubscriptionRepository");
const { isProActive } = require("./isProActive");
const { getAiChatQuota } = require("./getAiChatQuota");

const subscriptionRepo = new SubscriptionRepository();

async function getSubscriptionStatus(userId) {
  const row = await subscriptionRepo.getByUserId(userId);
  if (!row) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const proActive = isProActive(row);
  const chatQuota = await getAiChatQuota(userId);

  return {
    plan: proActive ? "pro" : "free",
    proActive,
    expiresAt: row.subscription_expires_at,
    provider: row.subscription_provider,
    chat: chatQuota,
  };
}

module.exports = { getSubscriptionStatus };
