/**
 * Derive structured facts from an import record (no AI invention).
 */
function pickUrls(text) {
  const matches = String(text || "").match(/https?:\/\/[^\s)\]"']+/gi) || [];
  return [...new Set(matches.map((u) => u.replace(/[.,;]+$/, "")))];
}

function inferApplicationStatus(record) {
  if (record.isRolling) return "rolling";
  const hay = `${record.title || ""} ${record.description || ""}`.toLowerCase();
  if (/\b(closed|now closed|applications are closed)\b/.test(hay)) return "closed";
  if (/\b(open|now open|applications open)\b/.test(hay)) return "open";
  if (record.deadline || record.applicationEndDate) return "open";
  return "unknown";
}

function extractScholarshipFacts(record) {
  const description = String(record.description || "").trim();
  const links = pickUrls(description);
  const officialLinks = links.filter((u) => {
    try {
      const host = new URL(u).hostname.replace(/^www\./, "");
      const srcHost = record.sourceUrl
        ? new URL(record.sourceUrl).hostname.replace(/^www\./, "")
        : "";
      const appHost = record.applicationUrl
        ? new URL(record.applicationUrl).hostname.replace(/^www\./, "")
        : "";
      return host === srcHost || host === appHost || /\.gov\.|chevening\.org|cscuk\.fcdo\.gov\.uk/i.test(host);
    } catch {
      return false;
    }
  });

  return {
    title: record.title || null,
    organization: record.organizationName || null,
    country: record.country || null,
    hostCountry: record.hostCountry || record.country || null,
    degreeLevel: record.degreeLevel || null,
    fieldOfStudy: record.fieldOfStudy || null,
    fundingType: record.fundingType || null,
    amount: record.amount || null,
    applicationUrl: record.applicationUrl || null,
    sourceUrl: record.sourceUrl || null,
    deadline: record.deadline || record.applicationEndDate || null,
    applicationStartDate: record.applicationStartDate || null,
    applicationEndDate: record.applicationEndDate || null,
    isRolling: Boolean(record.isRolling),
    applicationStatus: inferApplicationStatus(record),
    eligibleRegions: Array.isArray(record.eligibleRegions) ? record.eligibleRegions : [],
    officialLinks: officialLinks.length ? officialLinks : links.slice(0, 5),
    rawExcerpt: description.slice(0, 1200),
    extractedAt: new Date().toISOString(),
  };
}

module.exports = {
  extractScholarshipFacts,
  inferApplicationStatus,
};
