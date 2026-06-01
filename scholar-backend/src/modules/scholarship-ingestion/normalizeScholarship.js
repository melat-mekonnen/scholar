const { normalizeDegreeLevel } = require("./degreeLevel");
const { resolveApplicationDates } = require("../../utils/resolveApplicationDates");

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
  const recordType = raw.recordType === "study_programme" ? "study_programme" : "scholarship";
  const base = {
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
    programmeStartDate: raw.programmeStartDate || raw.startDate || null,
    sourceName: raw.sourceName ? String(raw.sourceName).trim() : "DAAD",
    sourceUrl: raw.sourceUrl ? String(raw.sourceUrl).trim() : null,
    externalId: raw.externalId ? String(raw.externalId).trim() : null,
    aiConfidence: raw.aiConfidence != null ? Number(raw.aiConfidence) : null,
    isRolling: Boolean(raw.isRolling),
    eligibleRegions: Array.isArray(raw.eligibleRegions) ? raw.eligibleRegions : [],
    hostCountry: raw.hostCountry ? String(raw.hostCountry).trim() : null,
    descriptionFromSite: raw.descriptionFromSite !== false,
    recordType,
  };
  const dates = resolveApplicationDates(base);
  return {
    ...base,
    applicationStartDate: dates.applicationStartDate,
    applicationEndDate: dates.applicationEndDate,
    deadline: dates.deadline,
    isRolling: dates.isRolling,
  };
}

module.exports = { normalizeScholarshipRecord };
