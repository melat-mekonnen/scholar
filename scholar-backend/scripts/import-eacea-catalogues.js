/**
 * Import programme-level scholarships from official EACEA catalogues:
 * - Erasmus Mundus Catalogue (~220 consortium apply URLs)
 * - Intra-Africa Scholarships (27 consortium apply URLs)
 *
 * Also rejects REGISTRY_SCALE rows that are EACEA hub/navigation pages (not programmes).
 *
 * Usage:
 *   node scripts/import-eacea-catalogues.js
 *   node scripts/import-eacea-catalogues.js --dry-run
 *   node scripts/import-eacea-catalogues.js --reject-junk-only
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { pool, query } = require("../src/infra/db/neonClient");
const { ScholarshipRepository } = require("../src/repositories/ScholarshipRepository");
const {
  fetchAllEaceaCatalogueProgrammes,
  toImportRecord,
} = require("../src/modules/scholarship-ingestion/connectors/eaceaCatalogueParser");
const { normalizeUrl } = require("../src/modules/scholarship-ingestion/urlNormalize");

const SOURCE_NAME = "EACEA_CATALOGUE";

function parseBool(name) {
  const arg = process.argv.find((p) => p.startsWith(`--${name}=`));
  if (!arg) return process.argv.includes(`--${name}`);
  return ["1", "true", "yes", "on"].includes(arg.split("=")[1]?.toLowerCase());
}

async function rejectEaceaHubJunk() {
  const result = await query(
    `UPDATE scholarships
     SET status = 'rejected',
         rejection_reason = 'eacea_hub_navigation_not_programme',
         updated_at = NOW()
     WHERE source_name = 'REGISTRY_SCALE'
       AND application_url ~ '^https?://(www\\.)?eacea\\.ec\\.europa\\.eu/'
       AND application_url NOT LIKE '%/scholarships/erasmus-mundus-catalogue%'
       AND application_url NOT LIKE '%/scholarships/intra-africa-scholarships%'
       AND application_url NOT LIKE '%/scholarships/emjmd-catalogue%'
     RETURNING id, title, application_url`,
  );
  return result.rows;
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
  const rejectJunkOnly = parseBool("reject-junk-only");

  const rejectedJunk = await rejectEaceaHubJunk();
  // eslint-disable-next-line no-console
  console.log(`Rejected ${rejectedJunk.length} REGISTRY_SCALE EACEA hub rows`);

  if (rejectJunkOnly) {
    await pool.end();
    return;
  }

  const { erasmus, intra, all } = await fetchAllEaceaCatalogueProgrammes({ delayMs: 120 });
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      { erasmusMundus: erasmus.length, intraAfrica: intra.length, total: all.length },
      null,
      2,
    ),
  );

  const exportPath = path.join(__dirname, "../data/eacea-catalogue-programmes.json");
  fs.writeFileSync(
    exportPath,
    JSON.stringify({ fetchedAt: new Date().toISOString(), erasmus, intra }, null, 2),
  );

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          dryRun: true,
          sample: all.slice(0, 5).map((item) => ({
            title: item.title,
            applicationUrl: item.applicationUrl,
            sourceUrl: item.sourceUrl,
          })),
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

  for (const item of all) {
    const raw = toImportRecord(item);
    if (!raw.applicationUrl) {
      skipped += 1;
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    await repo.upsertImportedScholarship({
      title: raw.title,
      organizationName: raw.organizationName,
      country: raw.country,
      degreeLevel: raw.degreeLevel,
      fieldOfStudy: raw.fieldOfStudy,
      fundingType: raw.fundingType,
      description: raw.description,
      applicationUrl: raw.applicationUrl,
      sourceName: SOURCE_NAME,
      sourceUrl: raw.sourceUrl,
      externalId: raw.externalId,
      publishStatus: "verified",
      isRolling: raw.isRolling,
      eligibleRegions: raw.eligibleRegions,
      ingestionTier: raw.ingestionTier,
      normalizedSourceUrl: normalizeUrl(raw.sourceUrl),
      qualityScore: 80,
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
        rejectedHubJunk: rejectedJunk.length,
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
