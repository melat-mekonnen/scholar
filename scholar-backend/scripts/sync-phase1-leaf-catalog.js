/**
 * Direct upsert of all configured leaf + curated scrape records as verified PHASE1_CURATED.
 */
require("dotenv").config();

const { pool } = require("../src/infra/db/neonClient");
const { ScholarshipRepository } = require("../src/repositories/ScholarshipRepository");
const {
  buildLeafImportRecords,
  phase1ScrapeProgrammesWithDescriptions,
} = require("../src/modules/scholarship-ingestion/leafProgrammes/assembleLeafCatalog");
const { buildLeafProgrammeRecord } = require("../src/modules/scholarship-ingestion/leafProgrammes/buildLeafProgrammeRecord");
const { normalizeScholarshipRecord } = require("../src/modules/scholarship-ingestion/normalizeScholarship");
const { isBareHomepageUrl } = require("../src/modules/scholarship-ingestion/descriptionQuality");

const SOURCE = "PHASE1_CURATED";

function scrapeProgrammeRecords() {
  return phase1ScrapeProgrammesWithDescriptions()
    .map((programme) => {
      const title = programme.titleHint || programme.externalId;
      const description =
        programme.curatedDescription ||
        `${title}. Official programme information and application details are on the linked page.`;
      return buildLeafProgrammeRecord({
        externalId: programme.externalId,
        title,
        organizationName: programme.organizationName,
        country: programme.country,
        degreeLevel: programme.degreeLevel,
        fieldOfStudy: programme.fieldOfStudy || "multiple disciplines",
        fundingType: programme.fundingType || "fully_funded",
        url: programme.url,
        description: description.length >= 120 ? description : `${description} ${description}`.slice(0, 400),
        eligibleRegions: ["africa", "commonwealth", "developing"],
        isRolling: true,
      });
    })
    .filter(Boolean);
}

async function upsertRecord(repo, raw) {
  const normalized = normalizeScholarshipRecord({ ...raw, sourceName: SOURCE });
  const apply = normalized.applicationUrl || normalized.sourceUrl;
  if (!apply || isBareHomepageUrl(apply)) {
    return { ok: false, reason: "bare_url", title: normalized.title };
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
    sourceName: SOURCE,
    sourceUrl: normalized.sourceUrl,
    externalId: normalized.externalId,
    publishStatus: "verified",
    isRolling: normalized.isRolling ?? true,
    eligibleRegions: normalized.eligibleRegions,
    normalizedSourceUrl: normalized.normalizedSourceUrl,
  });
  return { ok: true, title: normalized.title };
}

async function main() {
  const repo = new ScholarshipRepository();

  const purged = await pool.query(
    `DELETE FROM scholarships
     WHERE source_name = $1
       AND (
         (status = 'rejected' AND (
           application_url ~* '^https?://[^/]+/?$'
           OR source_url ~* '^https?://[^/]+/?$'
         ))
         OR id IN (
           SELECT s.id
           FROM scholarships s
           INNER JOIN scholarships newer
             ON newer.source_name = s.source_name
            AND newer.external_id = s.external_id
            AND newer.id <> s.id
            AND newer.updated_at >= s.updated_at
           WHERE s.source_name = $1
             AND s.external_id IS NOT NULL
         )
       )
     RETURNING id`,
    [SOURCE],
  );

  const records = [...buildLeafImportRecords(), ...scrapeProgrammeRecords()];
  let upserted = 0;
  const skipped = [];

  for (const raw of records) {
    // eslint-disable-next-line no-await-in-loop
    const result = await upsertRecord(repo, raw);
    if (result.ok) upserted += 1;
    else skipped.push(result);
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        upserted,
        skippedCount: skipped.length,
        skipped: skipped.slice(0, 10),
        purgedStaleRejected: purged.rowCount,
        configuredTotal: records.length,
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
