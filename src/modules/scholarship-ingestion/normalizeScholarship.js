function normalizeScholarshipRecord(raw) {
  return {
    title: String(raw.title || "").trim(),
    organizationName: raw.organizationName ? String(raw.organizationName).trim() : null,
    country: String(raw.country || "").trim(),
    degreeLevel: raw.degreeLevel ? String(raw.degreeLevel).trim().toLowerCase() : null,
    fieldOfStudy: raw.fieldOfStudy ? String(raw.fieldOfStudy).trim().toLowerCase() : null,
    fundingType: raw.fundingType ? String(raw.fundingType).trim().toLowerCase() : null,
    deadline: raw.deadline || null,
    amount: raw.amount ? String(raw.amount).trim() : null,
    description: raw.description ? String(raw.description).trim() : null,
    applicationUrl: raw.applicationUrl ? String(raw.applicationUrl).trim() : null,
    sourceName: raw.sourceName ? String(raw.sourceName).trim() : "DAAD",
    sourceUrl: raw.sourceUrl ? String(raw.sourceUrl).trim() : null,
    externalId: raw.externalId ? String(raw.externalId).trim() : null,
  };
}

module.exports = { normalizeScholarshipRecord };
