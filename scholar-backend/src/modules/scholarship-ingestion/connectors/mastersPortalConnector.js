const { buildLeafProgrammeRecord } = require("../leafProgrammes/buildLeafProgrammeRecord");
const { loadMastersPortalSeedFile, DEFAULT_SEED_FILE } = require("./loadMastersPortalSeeds");

const MASTERSPORTAL_SOURCE = "MASTERSPORTAL";

/**
 * MastersPortal blocks automated listing crawls (Cloudflare).
 * Import curated detail-page seeds with official apply URLs instead.
 */
function mapSeedToImportRecord(seed) {
  const description = String(seed.description || "").trim();
  if (description.length < 120) return null;

  return buildLeafProgrammeRecord({
    externalId: seed.externalId,
    title: seed.title,
    organizationName: seed.organizationName,
    country: seed.country || "International",
    hostCountry: seed.hostCountry || seed.country || "International",
    degreeLevel: seed.degreeLevel || "master",
    fieldOfStudy: seed.fieldOfStudy || "multiple disciplines",
    fundingType: seed.fundingType || "fully_funded",
    amount: seed.amount || null,
    deadline: seed.deadline || null,
    applicationStartDate: seed.applicationStartDate || null,
    applicationEndDate: seed.applicationEndDate || null,
    url: seed.applicationUrl,
    applicationUrl: seed.applicationUrl,
    sourceUrl: seed.sourceUrl || seed.applicationUrl,
    description,
    eligibleRegions: seed.eligibleRegions || ["africa", "developing"],
    isRolling: Boolean(seed.isRolling),
  });
}

async function fetchMastersPortalScholarships(options = {}) {
  const seedFile = options.seedFile || DEFAULT_SEED_FILE;
  const { scholarships, discoverySearchUrl, notes } = loadMastersPortalSeedFile(seedFile);

  const records = [];
  const skipped = [];

  for (const seed of scholarships) {
    const record = mapSeedToImportRecord(seed);
    if (!record) {
      skipped.push({ externalId: seed.externalId, reason: "invalid_seed" });
      continue;
    }
    records.push({
      ...record,
      sourceName: MASTERSPORTAL_SOURCE,
      descriptionFromSite: true,
    });
  }

  if (records.length === 0) {
    const err = new Error(
      "No valid MastersPortal seed records. Add scholarships to data/mastersportal-seeds.json",
    );
    err.meta = { discoverySearchUrl, notes, skipped };
    throw err;
  }

  return records;
}

module.exports = {
  MASTERSPORTAL_SOURCE,
  mapSeedToImportRecord,
  fetchMastersPortalScholarships,
};
