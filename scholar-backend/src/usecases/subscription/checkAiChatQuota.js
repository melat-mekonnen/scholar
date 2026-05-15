const { env } = require("../../config/env");
const { SubscriptionRepository } = require("../../repositories/SubscriptionRepository");
const { AiChatUsageRepository } = require("../../repositories/AiChatUsageRepository");
const { isProActive } = require("./isProActive");
const { getUsageDateString, getNextResetAtUtc } = require("./usageDate");

const subscriptionRepo = new SubscriptionRepository();
const usageRepo = new AiChatUsageRepository();

function roleBypassesQuota(role) {
  if (!role) return false;
  return env.chatQuotaBypassRoles.includes(String(role).toLowerCase());
}

async function checkAiChatQuota(userId) {
  if (!userId) {
    const err = new Error("Authentication required");
    err.statusCode = 401;
    throw err;
  }

  const row = await subscriptionRepo.getByUserId(userId);
  if (!row) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const usageDate = getUsageDateString();
  const resetsAt = getNextResetAtUtc();

  if (roleBypassesQuota(row.role)) {
    return {
      allowed: true,
      plan: row.subscription_plan || "free",
      role: row.role,
      unlimited: true,
      bypass: true,
      used: 0,
      limit: null,
      remaining: null,
      usageDate,
      resetsAt,
    };
  }

  if (isProActive(row)) {
    return {
      allowed: true,
      plan: "pro",
      role: row.role,
      unlimited: true,
      bypass: false,
      used: 0,
      limit: null,
      remaining: null,
      usageDate,
      resetsAt,
      expiresAt: row.subscription_expires_at,
    };
  }

  const limit = env.chatFreeDailyLimit;
  const used = await usageRepo.getCount(userId, usageDate);
  const remaining = Math.max(0, limit - used);

  return {
    allowed: used < limit,
    plan: "free",
    role: row.role,
    unlimited: false,
    bypass: false,
    used,
    limit,
    remaining,
    usageDate,
    resetsAt,
  };
}

module.exports = { checkAiChatQuota, roleBypassesQuota };
