/**
 * Import curated MastersPortal scholarship seeds (official apply URLs required).
 *
 * MastersPortal search/listing pages block server crawlers — browse the search URL
 * in a browser and add detail pages to data/mastersportal-seeds.json.
 *
 * Usage:
 *   node scripts/scholarships/import-mastersportal-seeds.js
 *   node scripts/scholarships/import-mastersportal-seeds.js --file=data/mastersportal-seeds.json
 */
require("dotenv").config();

const path = require("path");
const { pool } = require("../../src/infra/db/neonClient");
const { ScholarshipRepository } = require("../../src/repositories/ScholarshipRepository");
const { normalizeScholarshipRecord } = require("../../src/modules/scholarship-ingestion/normalizeScholarship");
const { isBareHomepageUrl } = require("../../src/modules/scholarship-ingestion/descriptionQuality");
const {
  fetchMastersPortalScholarships,
  MASTERSPORTAL_SOURCE,
} = require("../../src/modules/scholarship-ingestion/connectors/mastersPortalConnector");
const { loadMastersPortalSeedFile } = require("../../src/modules/scholarship-ingestion/connectors/loadMastersPortalSeeds");

function parseArg(name, fallback) {
  const arg = process.argv.find((part) => part.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : fallback;
}

function resolvePublishStatus() {
  const requested = parseArg("status", "needs_review");
  if (["needs_review", "pending", "verified"].includes(requested)) return requested;
  return "needs_review";
}

async function upsertRecord(repo, raw, publishStatus) {
  const normalized = normalizeScholarshipRecord({ ...raw, sourceName: MASTERSPORTAL_SOURCE });
  const apply = normalized.applicationUrl || normalized.sourceUrl;
  if (!apply || isBareHomepageUrl(apply)) {
    return { ok: false, reason: "bare_or_missing_url", title: normalized.title };
  }
  if (apply.includes("mastersportal.com/search/")) {
    return { ok: false, reason: "listing_hub_url", title: normalized.title };
  }

  await repo.upsertImportedScholarship({
    title: normalized.title,
    organizationName: normalized.organizationName,
    country: normalized.country,
    hostCountry: normalized.hostCountry,
    degreeLevel: normalized.degreeLevel,
    fieldOfStudy: normalized.fieldOfStudy,
    fundingType: normalized.fundingType,
    deadline: normalized.deadline,
    applicationStartDate: normalized.applicationStartDate,
    applicationEndDate: normalized.applicationEndDate,
    amount: normalized.amount,
    description: normalized.description,
    applicationUrl: normalized.applicationUrl,
    sourceName: MASTERSPORTAL_SOURCE,
    sourceUrl: normalized.sourceUrl,
    externalId: normalized.externalId,
    publishStatus,
    isRolling: normalized.isRolling ?? false,
    eligibleRegions: normalized.eligibleRegions,
    normalizedSourceUrl: normalized.normalizedSourceUrl,
  });
  return { ok: true, title: normalized.title, applicationUrl: normalized.applicationUrl, publishStatus };
}

async function main() {
  const seedFile = parseArg("file", path.join(__dirname, "../../data/mastersportal-seeds.json"));
  const publishStatus = resolvePublishStatus();
  const meta = loadMastersPortalSeedFile(seedFile);
  const records = await fetchMastersPortalScholarships({ seedFile });
  const repo = new ScholarshipRepository();

  let upserted = 0;
  const skipped = [];

  for (const raw of records) {
    // eslint-disable-next-line no-await-in-loop
    const result = await upsertRecord(repo, raw, publishStatus);
    if (result.ok) upserted += 1;
    else skipped.push(result);
  }

  const counts = await pool.query(
    `SELECT status, COUNT(*)::int AS total
     FROM scholarships
     WHERE source_name = $1
     GROUP BY status
     ORDER BY status`,
    [MASTERSPORTAL_SOURCE],
  );

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        source: MASTERSPORTAL_SOURCE,
        publishStatus,
        discoverySearchUrl: meta.discoverySearchUrl,
        upserted,
        skipped,
        statusCounts: counts.rows,
        seedFile: path.resolve(seedFile),
      },
      null,
      2,
    ),
  );
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
