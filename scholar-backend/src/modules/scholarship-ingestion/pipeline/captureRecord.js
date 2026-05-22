const { normalizeUrl } = require("../urlNormalize");

/**
 * Minimal capture gate — keep everything that looks like a fetchable programme page.
 */
function canCaptureRecord(normalized) {
  const errors = [];
  if (!normalized.title || normalized.title.length < 3) {
    errors.push("title missing");
  }
  if (!normalized.sourceUrl && !normalized.applicationUrl) {
    errors.push("no source or application url");
  }
  return { ok: errors.length === 0, errors };
}

function buildCanonicalKey(normalized, sourceName) {
  const urlKey =
    normalizeUrl(normalized.normalizedSourceUrl) ||
    normalizeUrl(normalized.sourceUrl) ||
    normalizeUrl(normalized.applicationUrl);
  if (urlKey) return urlKey;
  const ext = normalized.externalId || normalized.title || "unknown";
  return `${String(sourceName || "unknown").toLowerCase()}:${ext}`.slice(0, 240);
}

module.exports = {
  canCaptureRecord,
  buildCanonicalKey,
};
