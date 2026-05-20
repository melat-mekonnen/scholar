const {
  isPollutedDescription,
  isLowQualityTitle,
  isListingHubUrl,
} = require("./descriptionQuality");
const { classifyScholarshipRecord } = require("./scholarshipClassifier");

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (_err) {
    return false;
  }
}

function validateScholarshipRecord(record) {
  const errors = [];

  if (!record.title || record.title.length < 4) errors.push("title is required");
  if (!record.country) errors.push("country is required");
  if (!record.sourceName) errors.push("sourceName is required");
  if (!record.applicationUrl) errors.push("applicationUrl is required");
  if (record.applicationUrl && !isValidUrl(record.applicationUrl)) {
    errors.push("applicationUrl must be a valid URL");
  }
  if (!record.sourceUrl) {
    errors.push("sourceUrl is required");
  } else if (!isValidUrl(record.sourceUrl)) {
    errors.push("sourceUrl must be a valid URL");
  }
  if (!record.description || record.description.length < 100) {
    errors.push("description must be extracted from the official source page (min 100 chars)");
  }
  if (record.descriptionFromSite === false) {
    errors.push("description must come from the official listing page, not a template");
  }
  if (record.description && isPollutedDescription(record.description)) {
    errors.push("description appears to be a listing page, 404, or mixed programmes");
  }
  if (record.title && isLowQualityTitle(record.title)) {
    errors.push("title is too generic or looks like an archive/listing page");
  }
  if (record.sourceUrl && isListingHubUrl(record.sourceUrl)) {
    errors.push("sourceUrl must be a single programme page, not a scholarships index");
  }
  if (record.description && record.description.length > 12000) {
    errors.push("description exceeds maximum length");
  }

  const classification = classifyScholarshipRecord(record);
  if (classification.reject) {
    errors.push(`not a scholarship programme: ${classification.reason}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

module.exports = { validateScholarshipRecord };
