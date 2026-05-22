/**
 * Upsert configured leaf + scrape programme records as verified curated leaves.
 */
require("dotenv").config();

const { pool } = require("../../src/infra/db/neonClient");
const { ScholarshipRepository } = require("../../src/repositories/ScholarshipRepository");
const { maybeTranslateScholarship } = require("../../src/services/scholarshipAmharicContent");
const {
  buildLeafImportRecords,
  scrapeProgrammesWithDescriptions,
} = require("../../src/modules/scholarship-ingestion/leafProgrammes/assembleLeafCatalog");
const { buildLeafProgrammeRecord } = require("../../src/modules/scholarship-ingestion/leafProgrammes/buildLeafProgrammeRecord");
const { normalizeScholarshipRecord } = require("../../src/modules/scholarship-ingestion/normalizeScholarship");
const { isBareHomepageUrl, isNonProgrammeHubUrl } = require("../../src/modules/scholarship-ingestion/descriptionQuality");
const { auditCuratedApplyRecord } = require("../../src/modules/scholarship-ingestion/leafProgrammes/leafApplyUrl");
const { classifyScholarshipRecord } = require("../../src/modules/scholarship-ingestion/scholarshipClassifier");
const { CURATED_LEAF_SOURCE } = require("../../src/modules/scholarship-ingestion/sourceNames");

const SOURCE = CURATED_LEAF_SOURCE;

function scrapeProgrammeRecords() {
  return scrapeProgrammesWithDescriptions()
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
        descriptionFromSite: false,
        eligibleRegions: ["africa", "commonwealth", "developing"],
        isRolling: true,
      });
    })
    .filter(Boolean);
}

async function upsertRecord(repo, raw, { validateClassification = false } = {}) {
  const normalized = normalizeScholarshipRecord({ ...raw, sourceName: SOURCE });
  const apply = normalized.applicationUrl || normalized.sourceUrl;
  if (!apply || isBareHomepageUrl(apply) || isNonProgrammeHubUrl(apply)) {
    return { ok: false, reason: "bare_url", title: normalized.title };
  }

  const urlIssues = auditCuratedApplyRecord({
    externalId: normalized.externalId,
    title: normalized.title,
    applicationUrl: normalized.applicationUrl,
    sourceUrl: normalized.sourceUrl,
  });
  if (urlIssues.length > 0) {
    return { ok: false, reason: urlIssues.join(","), title: normalized.title };
  }

  if (validateClassification) {
    const classification = classifyScholarshipRecord(normalized);
    if (classification.reject) {
      return { ok: false, reason: classification.reason || "not_scholarship", title: normalized.title };
    }
  }

  const saved = await repo.upsertImportedScholarship({
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
    replaceDescription: true,
  });
  if (saved?.id) {
    maybeTranslateScholarship(saved.id);
  }
  return { ok: true, title: normalized.title, id: saved?.id };
}

async function main() {
  const repo = new ScholarshipRepository();

  const purged = await pool.query(
    `UPDATE scholarships
     SET status = 'rejected', updated_at = NOW()
     WHERE status IN ('verified', 'pending', 'needs_review')
       AND (
         external_id = 'et-moe-foreign-study'
         OR external_id LIKE 'et-moe-en%'
         OR external_id LIKE 'et-moe-announcement%'
         OR title ILIKE 'Ethiopia Foreign Study Programmes'
         OR application_url ~* '^https?://(www\\.)?moe\\.gov\\.et/en/?$'
         OR source_url ~* '^https?://(www\\.)?moe\\.gov\\.et/en/?$'
         OR source_url ~* '^https?://(www\\.)?moe\\.gov\\.et/en/announcement'
       )
     RETURNING id`,
  );

  const records = [...buildLeafImportRecords(), ...scrapeProgrammeRecords()];
  let upserted = 0;
  const skipped = [];

  for (const raw of buildLeafImportRecords()) {
    // eslint-disable-next-line no-await-in-loop
    const result = await upsertRecord(repo, raw);
    if (result.ok) upserted += 1;
    else skipped.push(result);
  }

  for (const raw of scrapeProgrammeRecords()) {
    // eslint-disable-next-line no-await-in-loop
    const result = await upsertRecord(repo, raw, { validateClassification: true });
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

  const { execSync } = require("child_process");
  execSync("node scripts/purge-stale-catalog-urls.js", {
    stdio: "inherit",
    env: process.env,
  });

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
