/**
 * Phase 1 curated ingest: ~30 official programme pages (Chevening, Commonwealth,
 * Fulbright, DAAD programmes, Australia Awards, African ministries, foundations).
 * Skips hub crawls and aggregators. Runs promote after ingest.
 */
require("dotenv").config();

process.env.INGESTION_ENABLED = "true";
process.env.INGEST_DAAD_ENABLED = "false";

const { pool } = require("../src/infra/db/neonClient");
const { runScholarshipIngestion } = require("../src/modules/scholarship-ingestion/runScholarshipIngestion");
const { ScholarshipIngestionRepository } = require("../src/repositories/ScholarshipIngestionRepository");

async function main() {
  const ingest = await runScholarshipIngestion({ source: "phase1" });
  // eslint-disable-next-line no-console
  console.log("Phase 1 ingest:", JSON.stringify(ingest, null, 2));

  const { execSync } = require("child_process");
  execSync("node scripts/promote-quality-scholarships.js", {
    stdio: "inherit",
    env: process.env,
  });

  const ingestionRepo = new ScholarshipIngestionRepository();
  const health = await ingestionRepo.listSourceHealth();
  // eslint-disable-next-line no-console
  console.log("Source health:", JSON.stringify(health, null, 2));

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
