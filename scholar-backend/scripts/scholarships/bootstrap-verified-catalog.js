/**
 * Bootstrap verified scholarship catalog: schema, sync leaves, quality gates.
 */
require("dotenv").config();

const { pool } = require("../../src/infra/db/neonClient");
const { ScholarshipRepository } = require("../../src/repositories/ScholarshipRepository");
const { catalogSummary } = require("../../src/modules/scholarship-ingestion/leafProgrammes/assembleLeafCatalog");
const { curatedLeafSourceNames } = require("../../src/modules/scholarship-ingestion/sourceNames");
const { runScript } = require("../lib/run");

process.env.INGESTION_ENABLED = "true";
process.env.INGEST_DAAD_ENABLED = "false";

const MIN_VERIFIED_CURATED = Number(process.env.MIN_VERIFIED_CURATED_LEAVES || 155);

async function main() {
  const summary = catalogSummary();
  // eslint-disable-next-line no-console
  console.log("Leaf catalog configured:", JSON.stringify(summary));

  runScript("db/migrations/migrate-content-schema.js");
  runScript("scholarships/sync-leaf-catalog.js");

  const repo = new ScholarshipRepository();
  await repo.normalizeLegacySourceNames();

  const reactivated = await repo.reactivateCuratedLeafScholarships();
  // eslint-disable-next-line no-console
  console.log(`Reactivated ${reactivated.length} curated leaf scholarships`);

  const promoted = await repo.promoteCuratedLeafScholarships();
  // eslint-disable-next-line no-console
  console.log(`Promoted ${promoted.length} curated needs_review scholarships`);

  const rejected = await repo.rejectBareHomepageScholarships();
  // eslint-disable-next-line no-console
  console.log(`Rejected ${rejected.length} remaining bare-homepage rows`);

  const purged = await repo.purgeStaleCuratedDuplicates();
  // eslint-disable-next-line no-console
  console.log(`Purged ${purged.length} stale duplicate curated rows`);

  const sources = curatedLeafSourceNames();
  const counts = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM scholarships
        WHERE source_name = ANY($1::text[]) AND status = 'verified') AS verified_curated,
       (SELECT COUNT(*)::int FROM scholarships
        WHERE source_name = ANY($1::text[]) AND status = 'rejected') AS rejected_curated,
       (SELECT COUNT(*)::int FROM scholarships WHERE status = 'verified') AS verified_total,
       (SELECT COUNT(*)::int FROM scholarships
        WHERE status = 'verified' AND COALESCE(record_type, 'scholarship') = 'scholarship') AS verified_scholarships`,
    [sources],
  );
  const row = counts.rows[0];
  // eslint-disable-next-line no-console
  console.log("Bootstrap verified catalog:", row);

  if (Number(row.verified_curated) < MIN_VERIFIED_CURATED) {
    // eslint-disable-next-line no-console
    console.error(
      `Bootstrap incomplete: ${row.verified_curated} verified curated (target ${MIN_VERIFIED_CURATED})`,
    );
    process.exitCode = 1;
  } else {
    // eslint-disable-next-line no-console
    console.log(`Bootstrap complete: ${row.verified_curated} verified curated scholarships.`);
  }

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
