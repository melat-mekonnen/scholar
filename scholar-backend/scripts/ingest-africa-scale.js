/**
 * Africa-scale ingestion: ministries, universities, research networks, aggregators.
 * Skips DAAD and other slow EU crawlers. Promotes quality rows after ingest.
 */
require("dotenv").config();

process.env.INGESTION_ENABLED = "true";
process.env.INGEST_DAAD_ENABLED = "false";
process.env.INGEST_AFRICAN_MINISTRIES_ENABLED = "true";
process.env.INGEST_AFRICAN_UNIVERSITIES_ENABLED = "true";
process.env.INGEST_AFRICAN_AGGREGATORS_ENABLED = "true";
process.env.INGEST_AFRICAN_RESEARCH_ENABLED = "true";

const { pool } = require("../src/infra/db/neonClient");
const { runScholarshipIngestion } = require("../src/modules/scholarship-ingestion/runScholarshipIngestion");
const { ScholarshipIngestionRepository } = require("../src/repositories/ScholarshipIngestionRepository");

async function main() {
  const ingest = await runScholarshipIngestion({ source: "africa" });
  // eslint-disable-next-line no-console
  console.log("Ingest:", JSON.stringify(ingest, null, 2));

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
