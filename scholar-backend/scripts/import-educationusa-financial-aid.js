/**
 * Import individual scholarships from EducationUSA Find Financial Aid listings.
 *
 * Listings support Drupal view filters, e.g. undergraduate associate:
 *   https://educationusa.state.gov/find-financial-aid?field_scholarship_degree_levels_tid=15&field_us_state_territory_tid=All&field_country_target_id=
 *
 * Usage:
 *   node scripts/import-educationusa-financial-aid.js
 *   node scripts/import-educationusa-financial-aid.js --dry-run
 *   node scripts/import-educationusa-financial-aid.js --by-degree
 *   node scripts/import-educationusa-financial-aid.js --degree=15
 *   node scripts/import-educationusa-financial-aid.js --list-only
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { pool, query } = require("../src/infra/db/neonClient");
const { ScholarshipRepository } = require("../src/repositories/ScholarshipRepository");
const {
  fetchAllEducationUsaProgrammes,
  toImportRecord,
} = require("../src/modules/scholarship-ingestion/connectors/educationusaFinancialAidParser");
const { normalizeUrl } = require("../src/modules/scholarship-ingestion/urlNormalize");

const SOURCE_NAME = "EDUCATIONUSA_FINANCIAL_AID";

function parseBool(name) {
  const arg = process.argv.find((p) => p.startsWith(`--${name}=`));
  if (!arg) return process.argv.includes(`--${name}`);
  return ["1", "true", "yes", "on"].includes(arg.split("=")[1]?.toLowerCase());
}

function parseArg(name) {
  const arg = process.argv.find((p) => p.startsWith(`--${name}=`));
  return arg ? arg.split("=").slice(1).join("=") : null;
}

async function dedupeByApplicationUrl() {
  const dupes = await query(
    `SELECT application_url, array_agg(id ORDER BY quality_score DESC NULLS LAST, updated_at DESC) AS ids
     FROM scholarships
     WHERE application_url IS NOT NULL
       AND application_url <> ''
       AND status IN ('verified', 'needs_review', 'pending')
     GROUP BY application_url
     HAVING COUNT(*) > 1`,
  );
  let rejected = 0;
  for (const row of dupes.rows) {
    const [, ...drop] = row.ids;
    for (const id of drop) {
      // eslint-disable-next-line no-await-in-loop
      await query(
        `UPDATE scholarships SET status = 'duplicate', updated_at = NOW() WHERE id = $1`,
        [id],
      );
      rejected += 1;
    }
  }
  return rejected;
}

async function countVisible() {
  const r = await query(
    `SELECT COUNT(*)::int AS n
     FROM scholarships
     WHERE status = 'verified'
       AND COALESCE(record_type, 'scholarship') = 'scholarship'
       AND LOWER(COALESCE(application_status, '')) <> 'closed'
       AND (deadline IS NULL OR deadline >= CURRENT_DATE OR is_rolling = TRUE)`,
  );
  return r.rows[0]?.n || 0;
}

async function main() {
  const dryRun = parseBool("dry-run");
  const listOnly = parseBool("list-only");
  const byDegree = parseBool("by-degree");
  const degreeTid = parseArg("degree");
  const delayMs = Number(parseArg("delay-ms") || 120);

  const items = await fetchAllEducationUsaProgrammes({
    delayMs,
    byDegree,
    degreeTid,
    fetchDetails: !listOnly,
  });

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        fetched: items.length,
        byDegree,
        degreeTid,
        listOnly,
      },
      null,
      2,
    ),
  );

  const exportPath = path.join(__dirname, "../data/educationusa-financial-aid-programmes.json");
  fs.writeFileSync(
    exportPath,
    JSON.stringify({ fetchedAt: new Date().toISOString(), items }, null, 2),
  );

  if (dryRun || listOnly) {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          dryRun: dryRun || listOnly,
          sample: items.slice(0, 5).map((item) => ({
            title: item.title,
            sourceUrl: item.sourceUrl,
            applicationUrl: item.applicationUrl,
            organizationName: item.organizationName,
            degreeLevel: item.degreeLevel,
          })),
          exportPath,
        },
        null,
        2,
      ),
    );
    await pool.end();
    return;
  }

  const beforeVisible = await countVisible();
  const repo = new ScholarshipRepository();
  let upserted = 0;
  let skipped = 0;

  for (const item of items) {
    const raw = toImportRecord(item);
    if (!raw.title || !raw.sourceUrl) {
      skipped += 1;
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await repo.upsertImportedScholarship({
      title: raw.title,
      organizationName: raw.organizationName,
      country: raw.country,
      hostCountry: raw.hostCountry,
      degreeLevel: raw.degreeLevel,
      fieldOfStudy: raw.fieldOfStudy,
      fundingType: raw.fundingType,
      description: raw.description,
      applicationUrl: raw.applicationUrl,
      sourceName: SOURCE_NAME,
      sourceUrl: raw.sourceUrl,
      externalId: raw.externalId,
      publishStatus: "verified",
      deadline: raw.deadline,
      applicationStartDate: raw.applicationStartDate,
      applicationEndDate: raw.applicationEndDate,
      isRolling: raw.isRolling,
      eligibleRegions: raw.eligibleRegions,
      ingestionTier: raw.ingestionTier,
      normalizedSourceUrl: normalizeUrl(raw.sourceUrl),
      qualityScore: 78,
    });
    upserted += 1;
  }

  const deduped = await dedupeByApplicationUrl();
  const afterVisible = await countVisible();

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        source: SOURCE_NAME,
        upserted,
        skipped,
        dedupedByApplyUrl: deduped,
        visibleBefore: beforeVisible,
        visibleAfter: afterVisible,
        exportPath,
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
