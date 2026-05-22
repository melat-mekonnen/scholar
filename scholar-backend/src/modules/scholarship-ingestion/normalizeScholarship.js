const { normalizeDegreeLevel } = require("./degreeLevel");

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function normalizeScholarshipRecord(raw) {
  const degreeLevel = normalizeDegreeLevel(raw.degreeLevel);
  return {
    title: decodeHtmlEntities(String(raw.title || "").trim()),
    organizationName: raw.organizationName ? String(raw.organizationName).trim() : null,
    country: String(raw.country || "").trim(),
    degreeLevel,
    fieldOfStudy: raw.fieldOfStudy ? String(raw.fieldOfStudy).trim().toLowerCase() : null,
    fundingType: raw.fundingType ? String(raw.fundingType).trim().toLowerCase() : null,
    deadline: raw.deadline || null,
    amount: raw.amount ? String(raw.amount).trim() : null,
    description: raw.description ? String(raw.description).trim() : null,
    applicationUrl: raw.applicationUrl ? String(raw.applicationUrl).trim() : null,
    applicationStartDate: raw.applicationStartDate || null,
    applicationEndDate: raw.applicationEndDate || null,
    sourceName: raw.sourceName ? String(raw.sourceName).trim() : "DAAD",
    sourceUrl: raw.sourceUrl ? String(raw.sourceUrl).trim() : null,
    externalId: raw.externalId ? String(raw.externalId).trim() : null,
    aiConfidence: raw.aiConfidence != null ? Number(raw.aiConfidence) : null,
    isRolling: Boolean(raw.isRolling),
    eligibleRegions: Array.isArray(raw.eligibleRegions) ? raw.eligibleRegions : [],
    hostCountry: raw.hostCountry ? String(raw.hostCountry).trim() : null,
    descriptionFromSite: raw.descriptionFromSite !== false,
    extractedFacts:
      raw.extractedFacts && typeof raw.extractedFacts === "object" ? raw.extractedFacts : null,
  };
}

module.exports = { normalizeScholarshipRecord };
