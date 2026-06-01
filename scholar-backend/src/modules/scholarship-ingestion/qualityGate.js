const { resolveIngestionTier, isHubTitle } = require("./govTrustedDomains");
const {
  isPollutedDescription,
  isLowQualityTitle,
  isListingHubUrl,
  isBareHomepageUrl,
  isNonProgrammeHubUrl,
} = require("./descriptionQuality");
const { classifyScholarshipRecord } = require("./scholarshipClassifier");
const { parseEligibleRegions, isOpenToAfricanStudents, africaSourceBoostScore } = require("./africaEligibility");
const { buildCountryFields } = require("./countryNormalize");
const { normalizeUrl } = require("./urlNormalize");

const MIN_DESCRIPTION_GOV = 200;
const MIN_DESCRIPTION_AGGREGATOR = 400;
const MIN_DESCRIPTION_OTHER = 200;

const ROLLING_PATTERNS = [
  /\brolling\b/i,
  /\bopen year[- ]round\b/i,
  /\bongoing\b/i,
  /\bcontinuously\b/i,
  /\bno fixed deadline\b/i,
  /\bapplications?\s+(are\s+)?open\b/i,
  /\bnow open\b/i,
  /\bcheck (the\s+)?website for (current\s+)?deadlines?\b/i,
  /\bdeadlines?\s+vary\b/i,
];

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

function hasRollingDeadline(record) {
  if (record.isRolling) return true;
  const hay = `${record.description || ""} ${record.title || ""}`;
  return ROLLING_PATTERNS.some((re) => re.test(hay));
}

function inferFundingRequired(record, tier) {
  if (record.fundingType) return true;
  return tier === "aggregator";
}

/**
 * @returns {{ pass: boolean, publishStatus: 'verified'|'pending', score: number, reasons: string[], tier: string, eligibleRegions: string[], isRolling: boolean }}
 */
function assessQualityGate(record, options = {}) {
  const reasons = [];
  let score = 0;

  const classification = classifyScholarshipRecord(record);
  if (classification.reject) {
    reasons.push(classification.reason || "not a scholarship programme");
  }

  const tier = options.tier || resolveIngestionTier(record);
  const sourceUrl = record.sourceUrl || record.applicationUrl || "";
  const eligibleRegions = buildCountryFields(
    record,
    parseEligibleRegions(
      `${record.title || ""} ${record.description || ""} ${record.fieldOfStudy || ""}`,
      sourceUrl,
    ),
  ).eligibleRegions;
  let isRolling = hasRollingDeadline(record);

  if (!record.title || record.title.length < 8) {
    reasons.push("title too short");
  } else if (isHubTitle(record.title) || isLowQualityTitle(record.title)) {
    reasons.push("generic hub title");
  } else {
    score += 15;
  }

  if (record.description && isPollutedDescription(record.description)) {
    reasons.push("polluted or listing-page description");
  }
  if (record.sourceUrl && isListingHubUrl(record.sourceUrl)) {
    reasons.push("source is a listing hub, not a programme page");
  }
  if (record.applicationUrl && (isBareHomepageUrl(record.applicationUrl) || isNonProgrammeHubUrl(record.applicationUrl))) {
    reasons.push("application URL is a bare homepage, not a programme page");
  }
  if (record.sourceUrl && (isBareHomepageUrl(record.sourceUrl) || isNonProgrammeHubUrl(record.sourceUrl))) {
    reasons.push("source URL is a bare homepage, not a programme page");
  }

  if (!record.country) reasons.push("country missing");
  else score += 10;

  if (!record.applicationUrl || !isValidUrl(record.applicationUrl)) {
    reasons.push("invalid applicationUrl");
  } else {
    score += 15;
  }

  if (!record.sourceUrl || !isValidUrl(record.sourceUrl)) {
    reasons.push("invalid sourceUrl");
  } else {
    score += 10;
  }

  const descLen = (record.description || "").length;
  const minDesc =
    tier === "government_trusted"
      ? MIN_DESCRIPTION_GOV
      : tier === "aggregator"
        ? MIN_DESCRIPTION_AGGREGATOR
        : MIN_DESCRIPTION_OTHER;

  if (descLen < minDesc) {
    reasons.push(`description under ${minDesc} chars`);
  } else {
    score += 25;
  }

  if (!record.deadline && !isRolling) {
    if (tier === "government_trusted" && descLen >= MIN_DESCRIPTION_GOV) {
      isRolling = true;
      score += 15;
    } else {
      reasons.push("no deadline or rolling status");
    }
  } else {
    score += 20;
  }

  if (!inferFundingRequired(record, tier)) {
    reasons.push("funding type not detected");
  } else {
    score += 10;
  }

  const validDegrees = ["high_school", "bachelor", "master", "phd"];
  if (record.degreeLevel && validDegrees.includes(record.degreeLevel)) {
    score += 5;
  } else if (tier !== "government_trusted") {
    reasons.push("degree level missing or invalid");
  }

  if (record.fundingType === "fully_funded") score += 15;
  else if (record.fundingType === "partially_funded") score += 8;

  if (isOpenToAfricanStudents(`${record.description || ""} ${record.title || ""}`, sourceUrl)) {
    score += 10;
    if (eligibleRegions.includes("africa")) score += 10;
  }

  score += africaSourceBoostScore(sourceUrl);
  if (tier === "government_trusted") score += 10;
  if (classification.reject) score -= 40;
  if (!record.deadline && !isRolling) score -= 20;

  let autoVerify = false;
  if (tier === "government_trusted") {
    autoVerify = reasons.length === 0;
  } else if (tier === "aggregator") {
    autoVerify = false;
    if (options.allowAggregatorAutoVerify === true && reasons.length === 0) {
      autoVerify = true;
    }
    if (!autoVerify && reasons.length === 0) {
      reasons.push("aggregator requires manual or explicit auto-verify");
    }
  } else {
    autoVerify = false;
    if (reasons.length === 0) score -= 5;
  }

  const publishStatus = autoVerify ? "verified" : "pending";

  const countryFields = buildCountryFields(record, eligibleRegions);

  return {
    pass: autoVerify,
    publishStatus,
    score: Math.max(0, Math.min(100, score)),
    qualityScore: Math.max(0, Math.min(100, score)),
    reasons,
    tier,
    eligibleRegions: countryFields.eligibleRegions,
    hostCountry: countryFields.hostCountry,
    country: countryFields.country,
    isRolling,
    normalizedSourceUrl: normalizeUrl(record.sourceUrl || record.applicationUrl),
  };
}

module.exports = {
  assessQualityGate,
  hasRollingDeadline,
  MIN_DESCRIPTION_GOV,
  MIN_DESCRIPTION_AGGREGATOR,
};
