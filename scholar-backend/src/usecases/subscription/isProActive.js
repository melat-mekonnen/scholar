function isProActive(row, now = new Date()) {
  if (!row || row.subscription_plan !== "pro") {
    return false;
  }
  if (!row.subscription_expires_at) {
    return true;
  }
  const expires = new Date(row.subscription_expires_at);
  return !Number.isNaN(expires.getTime()) && expires > now;
}

module.exports = { isProActive };
