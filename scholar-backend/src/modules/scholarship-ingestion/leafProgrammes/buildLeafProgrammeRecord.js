/**
 * Build an import record from structured leaf programme data (no page scrape required).
 */
function normalizeWebsiteUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return null;
  const href = /^https?:\/\//i.test(value) ? value : `https://${value.replace(/^\/+/, "")}`;
  try {
    const parsed = new URL(href);
    const fragment = parsed.hash;
    parsed.hash = "";
    let out = parsed.href;
    if (out.endsWith("/")) out = out.slice(0, -1);
    if (fragment && /^#nominator-/i.test(fragment)) {
      out += fragment.toLowerCase();
    } else if (fragment) {
      out += fragment;
    }
    return out;
  } catch {
    return null;
  }
}

function buildLeafProgrammeRecord(programme) {
  const applicationUrl = normalizeWebsiteUrl(programme.applicationUrl || programme.url);
  const sourceUrl = normalizeWebsiteUrl(programme.sourceUrl || programme.url || applicationUrl);
  if (!applicationUrl || !programme.title || !programme.description) return null;

  const description = String(programme.description).trim();
  if (description.length < 120) return null;

  return {
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
    description,
    descriptionFromSite: programme.descriptionFromSite === true,
    applicationUrl,
    sourceUrl,
    isRolling: Boolean(programme.isRolling),
    eligibleRegions: programme.eligibleRegions || ["africa", "commonwealth"],
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
