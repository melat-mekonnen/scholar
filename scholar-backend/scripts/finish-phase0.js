/**
 * Phase 0 finish: re-ingest leaf catalog, restore/re-verify curated rows, reject remaining hubs.
 * Target: >= 155 verified PHASE1_CURATED scholarships with leaf apply URLs.
 */
require("dotenv").config();

const { execSync } = require("child_process");
const { pool } = require("../src/infra/db/neonClient");
const { ScholarshipRepository } = require("../src/repositories/ScholarshipRepository");
const { catalogSummary } = require("../src/modules/scholarship-ingestion/leafProgrammes/assembleLeafCatalog");

process.env.INGESTION_ENABLED = "true";
process.env.INGEST_DAAD_ENABLED = "false";

const PHASE0_MIN_VERIFIED = 155;

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env, cwd: __dirname + "/.." });
}

async function main() {
  const summary = catalogSummary();
  // eslint-disable-next-line no-console
  console.log("Leaf catalog configured:", JSON.stringify(summary));

  run("node scripts/migrate-scholarship-phases.js");
  run("node scripts/sync-phase1-leaf-catalog.js");

  const repo = new ScholarshipRepository();

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

  const counts = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM scholarships WHERE source_name = 'PHASE1_CURATED' AND status = 'verified') AS verified_curated,
       (SELECT COUNT(*)::int FROM scholarships WHERE source_name = 'PHASE1_CURATED' AND status = 'rejected') AS rejected_curated,
       (SELECT COUNT(*)::int FROM scholarships WHERE status = 'verified') AS verified_total,
       (SELECT COUNT(*)::int FROM scholarships WHERE status = 'verified' AND COALESCE(record_type, 'scholarship') = 'scholarship') AS verified_scholarships`,
  );
  const row = counts.rows[0];
  // eslint-disable-next-line no-console
  console.log("Phase 0 counts:", row);

  if (Number(row.verified_curated) < PHASE0_MIN_VERIFIED) {
    // eslint-disable-next-line no-console
    console.error(
      `Phase 0 incomplete: ${row.verified_curated} verified curated (target ${PHASE0_MIN_VERIFIED})`,
    );
    process.exitCode = 1;
  } else {
    // eslint-disable-next-line no-console
    console.log(`Phase 0 complete: ${row.verified_curated} verified curated scholarships.`);
  }

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
