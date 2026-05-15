/**
 * Calendar date string (YYYY-MM-DD) for daily chat quota buckets.
 * Default UTC; override with CHAT_USAGE_TIMEZONE when you add tz support.
 */
function getUsageDateString(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function getNextResetAtUtc(now = new Date()) {
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0)
  );
  return next.toISOString();
}

module.exports = { getUsageDateString, getNextResetAtUtc };
