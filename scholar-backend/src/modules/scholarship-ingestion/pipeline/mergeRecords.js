const { normalizeUrl } = require("../urlNormalize");
const { resolveIngestionTier, isGovTrustedUrl } = require("../govTrustedDomains");
const { priorityForSourceType } = require("../sourceTypes");

const STATUS_RANK = {
  verified: 4,
  pending: 3,
  needs_review: 2,
  draft: 1,
  expired: 1,
  duplicate: 0,
  rejected: 0,
};

function statusRank(status) {
  return STATUS_RANK[String(status || "").toLowerCase()] ?? 0;
}

function pickLongerText(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  return right.length > left.length ? right : left;
}

function pickApplicationUrl(existing, incoming) {
  const ex = existing.applicationUrl || existing.application_url || "";
  const inc = incoming.applicationUrl || incoming.application_url || "";
  if (isGovTrustedUrl(inc) && !isGovTrustedUrl(ex)) return inc;
  if (isGovTrustedUrl(ex) && !isGovTrustedUrl(inc)) return ex;
  return inc || ex;
}

function pickPublishStatus(existing, incoming) {
  const ex = existing.status || existing.publishStatus || "draft";
  const inc = incoming.publishStatus || incoming.status || "draft";
  return statusRank(inc) >= statusRank(ex) ? inc : ex;
}

function pickSourcePriority(record) {
  if (record.ingestionSourcePriority != null) return Number(record.ingestionSourcePriority);
  if (record.ingestionSourceType) return priorityForSourceType(record.ingestionSourceType);
  return 99;
}

/**
 * Merge incoming scraped/curated fields into an existing catalog row without dropping data.
 */
function mergeScholarshipRecords(existing, incoming) {
  const exTier = existing.ingestion_tier || existing.ingestionTier || "other";
  const inTier = incoming.ingestionTier || resolveIngestionTier(incoming);
  const preferIncomingMeta = pickSourcePriority(incoming) < pickSourcePriority(existing);

  return {
    title: pickLongerText(existing.title, incoming.title) || incoming.title || existing.title,
    organizationName:
      (preferIncomingMeta ? incoming.organizationName : existing.organization_name || existing.organizationName) ||
      incoming.organizationName ||
      existing.organization_name,
    country: incoming.country || existing.country,
    hostCountry: incoming.hostCountry || existing.host_country || existing.hostCountry || incoming.country,
    degreeLevel: incoming.degreeLevel || existing.degree_level || existing.degreeLevel,
    fieldOfStudy: incoming.fieldOfStudy || existing.field_of_study || existing.fieldOfStudy,
    fundingType: incoming.fundingType || existing.funding_type || existing.fundingType,
    deadline: incoming.deadline || existing.deadline || null,
    applicationStartDate:
      incoming.applicationStartDate || existing.application_start_date || existing.applicationStartDate,
    applicationEndDate:
      incoming.applicationEndDate || existing.application_end_date || existing.applicationEndDate,
    amount: incoming.amount || existing.amount,
    description: pickLongerText(existing.description, incoming.description),
    applicationUrl: pickApplicationUrl(existing, incoming),
    sourceUrl: incoming.sourceUrl || existing.source_url || existing.sourceUrl,
    sourceName:
      (preferIncomingMeta ? incoming.sourceName : existing.source_name || existing.sourceName) ||
      incoming.sourceName,
    externalId: incoming.externalId || existing.external_id || existing.externalId,
    aiConfidence: incoming.aiConfidence ?? existing.ai_confidence ?? existing.aiConfidence,
    publishStatus: pickPublishStatus(existing, incoming),
    isRolling: Boolean(incoming.isRolling || existing.is_rolling || existing.isRolling),
    eligibleRegions:
      (incoming.eligibleRegions?.length ? incoming.eligibleRegions : null) ||
      existing.eligible_regions ||
      existing.eligibleRegions ||
      [],
    ingestionTier: preferIncomingMeta ? inTier : exTier || inTier,
    normalizedSourceUrl:
      incoming.normalizedSourceUrl ||
      existing.normalized_source_url ||
      existing.normalizedSourceUrl ||
      normalizeUrl(incoming.sourceUrl || existing.source_url),
    qualityScore: Math.max(
      Number(incoming.qualityScore || 0),
      Number(existing.quality_score || existing.qualityScore || 0),
    ),
    ingestionSourceType: incoming.ingestionSourceType || existing.ingestionSourceType,
    ingestionSourcePriority: incoming.ingestionSourcePriority ?? existing.ingestionSourcePriority,
  };
}

module.exports = {
  mergeScholarshipRecords,
  pickPublishStatus,
  pickLongerText,
};
