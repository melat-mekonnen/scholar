/**
 * Build an import record from structured leaf programme data (no page scrape required).
 */
const { resolveApplicationDates } = require("../../../utils/resolveApplicationDates");
function normalizeWebsiteUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  const withScheme = /^https?:\/\//i.test(value)
    ? value
    : `https://${value.replace(/^\/+/, "")}`;

  // Only append a trailing slash for "directory-style" paths. Never append it to
  // URLs that carry a query (?), a fragment (#), or a file extension in the last
  // path segment (e.g. .aspx, .html, .htm, .php) — doing so 404s those links.
  try {
    const u = new URL(withScheme);
    if (u.search || u.hash) return u.toString();
    const lastSegment = u.pathname.split("/").filter(Boolean).pop() || "";
    if (/\.[a-z0-9]{2,5}$/i.test(lastSegment)) {
      return u.toString().replace(/\/+$/, "");
    }
    if (!u.pathname.endsWith("/")) {
      u.pathname = `${u.pathname}/`;
    }
    return u.toString();
  } catch {
    return withScheme.replace(/\/+$/, "") + "/";
  }
}

function buildLeafProgrammeRecord(programme) {
  const applicationUrl = normalizeWebsiteUrl(programme.applicationUrl || programme.url);
  const sourceUrl = normalizeWebsiteUrl(programme.sourceUrl || programme.url || applicationUrl);
  if (!applicationUrl || !programme.title || !programme.description) return null;

  const description = String(programme.description).trim();
  if (description.length < 120) return null;

  const base = {
    externalId: programme.externalId,
    title: programme.title,
    organizationName: programme.organizationName,
    country: programme.country || "United Kingdom",
    hostCountry: programme.hostCountry || programme.country || "United Kingdom",
    degreeLevel: programme.degreeLevel || "master",
    fieldOfStudy: programme.fieldOfStudy || "multiple disciplines",
    fundingType: programme.fundingType || "fully_funded",
    amount: programme.amount || null,
    deadline: programme.deadline || null,
    applicationStartDate: programme.applicationStartDate || null,
    applicationEndDate: programme.applicationEndDate || null,
    programmeStartDate: programme.programmeStartDate || programme.startDate || null,
    description,
    descriptionFromSite: true,
    applicationUrl,
    sourceUrl,
    isRolling: Boolean(programme.isRolling),
    eligibleRegions: programme.eligibleRegions || ["africa", "commonwealth"],
    recordType: programme.recordType || "scholarship",
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

function buildLeafRecordsFromList(programmes) {
  const records = [];
  const seen = new Set();
  for (const programme of programmes) {
    const record = buildLeafProgrammeRecord(programme);
    if (!record) continue;
    const key = record.externalId || record.sourceUrl || record.applicationUrl;
    if (seen.has(key)) continue;
    seen.add(key);
    records.push(record);
  }
  return records;
}

module.exports = {
  buildLeafProgrammeRecord,
  buildLeafRecordsFromList,
  normalizeWebsiteUrl,
};
