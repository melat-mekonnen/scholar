const { checkAiChatQuota } = require("./checkAiChatQuota");

async function getAiChatQuota(userId) {
  const quota = await checkAiChatQuota(userId);
  return {
    plan: quota.plan,
    unlimited: quota.unlimited,
    used: quota.unlimited ? null : quota.used,
    limit: quota.unlimited ? null : quota.limit,
    remaining: quota.unlimited ? null : quota.remaining,
    resetsAt: quota.resetsAt,
    expiresAt: quota.expiresAt || null,
  };
}

module.exports = { getAiChatQuota };
