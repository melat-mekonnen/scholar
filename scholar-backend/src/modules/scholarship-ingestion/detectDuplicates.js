const { normalizeUrl, normalizeTitle, titleSimilarity } = require("./urlNormalize");
const { normalizeOrg } = require("./scholarshipClassifier");
const { resolveIngestionTier } = require("./govTrustedDomains");
const { getSourceConfigBySourceName } = require("./sourceRegistry");
const { priorityForSourceType } = require("./sourceTypes");

const TIER_PRIORITY = {
  government_trusted: 3,
  other: 2,
  aggregator: 1,
};

function tierPriority(tier) {
  return TIER_PRIORITY[tier] ?? 0;
}

function sourceTypeRank(record) {
  if (record.ingestionSourcePriority != null) {
    return Number(record.ingestionSourcePriority);
  }
  if (record.ingestionSourceType) {
    return priorityForSourceType(record.ingestionSourceType);
  }
  const name = record.sourceName || record.source_name;
  const config = getSourceConfigBySourceName(name);
  if (config?.sourceType) {
    return priorityForSourceType(config.sourceType);
  }
  return 99;
}

/**
 * Decide whether incoming should replace existing (higher priority source or richer data).
 */
function shouldPreferIncoming(existing, incoming) {
  const exRank = sourceTypeRank(existing);
  const inRank = sourceTypeRank(incoming);
  if (inRank < exRank) return true;
  if (inRank > exRank) return false;

  const exTier = existing.ingestion_tier || existing.ingestionTier || "other";
  const inTier = incoming.ingestionTier || resolveIngestionTier(incoming);
  if (tierPriority(inTier) > tierPriority(exTier)) return true;
  if (tierPriority(inTier) < tierPriority(exTier)) return false;
  const exLen = (existing.description || "").length;
  const inLen = (incoming.description || "").length;
  return inLen > exLen;
}

/**
 * @param {object} record normalized incoming
 * @param {object|null} existing row from DB
 * @param {{ mode?: 'strict'|'merge' }} options
 * @returns {{ action: 'insert'|'update'|'skip', reason: string }}
 */
function resolveDuplicateAction(record, existing, options = {}) {
  const mode = options.mode || "strict";
  if (!existing) {
    return { action: "insert", reason: "new" };
  }

  const inApp = normalizeUrl(record.applicationUrl);
  const exApp = normalizeUrl(existing.application_url || existing.applicationUrl);
  if (inApp && exApp && inApp === exApp) {
    if (shouldPreferIncoming(existing, record) || mode === "merge") {
      return { action: "update", reason: "same_application_url_better_source" };
    }
    return { action: "skip", reason: "duplicate_application_url" };
  }

  const sim = titleSimilarity(record.title, existing.title);
  const sameCountry =
    String(record.country || "").toLowerCase() === String(existing.country || "").toLowerCase();
  const sameDegree =
    !record.degreeLevel ||
    !existing.degree_level ||
    record.degreeLevel === existing.degree_level;
  const inOrg = normalizeOrg(record.organizationName || record.sourceName);
  const exOrg = normalizeOrg(existing.organization_name || existing.organizationName || existing.source_name);
  const sameProvider = inOrg && exOrg && inOrg === exOrg;

  if (sameProvider && sim >= 0.8) {
    if (shouldPreferIncoming(existing, record) || mode === "merge") {
      return { action: "update", reason: "same_provider_similar_title" };
    }
    return { action: "skip", reason: "duplicate_same_provider" };
  }

  if (sim >= 0.92 && sameCountry && sameDegree) {
    if (shouldPreferIncoming(existing, record) || mode === "merge") {
      return { action: "update", reason: "similar_title_better_source" };
    }
    return { action: "skip", reason: "similar_title_duplicate" };
  }

  if (sim >= 0.88 && sameCountry && (sameProvider || sim >= 0.92)) {
    if (mode === "merge") {
      return { action: "update", reason: "possible_duplicate_merged" };
    }
    return { action: "skip", reason: "possible_duplicate_flagged" };
  }

  return { action: "insert", reason: "distinct" };
}

module.exports = {
  resolveDuplicateAction,
  shouldPreferIncoming,
  normalizeUrl,
};
