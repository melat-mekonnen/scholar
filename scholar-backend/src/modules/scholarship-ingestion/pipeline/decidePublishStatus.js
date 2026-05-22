const { isHubTitle } = require("../govTrustedDomains");
const {
  isLowQualityTitle,
  isListingHubUrl,
  isPollutedDescription,
  isBareHomepageUrl,
} = require("../descriptionQuality");
const { classifyScholarshipRecord } = require("../scholarshipClassifier");
const { isCuratedLeafSource } = require("../sourceNames");

/**
 * Decide catalog status at publish time. Returns null when row should stay staging-only.
 */
function decidePublishStatus({ record, gate, sourceName, forcePublishStatus }) {
  if (forcePublishStatus) return forcePublishStatus;

  const classification = classifyScholarshipRecord(record);
  const isCurated = isCuratedLeafSource(sourceName);

  if (classification.reject && !isCurated) {
    return null;
  }

  if (record.title && (isHubTitle(record.title) || isLowQualityTitle(record.title)) && !isCurated) {
    return null;
  }

  if (record.sourceUrl && isListingHubUrl(record.sourceUrl) && !isCurated) {
    return null;
  }

  if (record.description && isPollutedDescription(record.description) && !isCurated) {
    return null;
  }

  if (isCurated) {
    const hasLeafUrl =
      record.applicationUrl &&
      !isBareHomepageUrl(record.applicationUrl) &&
      (record.description || "").length >= 120;
    if (hasLeafUrl) return "verified";
    return gate.publishStatus === "verified" ? "verified" : "needs_review";
  }

  if (gate.pass || gate.publishStatus === "verified") {
    return "verified";
  }

  const hasMinimumProgrammeText =
    (record.description || "").length >= 100 &&
    record.applicationUrl &&
    record.country &&
    record.title &&
    record.title.length >= 8;

  if (hasMinimumProgrammeText) {
    return "needs_review";
  }

  return null;
}

module.exports = { decidePublishStatus };
