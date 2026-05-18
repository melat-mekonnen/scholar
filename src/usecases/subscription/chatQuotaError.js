function createChatQuotaExceededError(quota) {
  const err = new Error(
    "Daily AI chat limit reached. Upgrade to Pro for unlimited chat."
  );
  err.statusCode = 402;
  err.code = "CHAT_QUOTA_EXCEEDED";
  err.plan = quota.plan;
  err.used = quota.used;
  err.limit = quota.limit;
  err.remaining = quota.remaining;
  err.resetsAt = quota.resetsAt;
  return err;
}

module.exports = { createChatQuotaExceededError };
