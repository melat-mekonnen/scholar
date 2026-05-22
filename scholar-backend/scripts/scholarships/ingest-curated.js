/**
 * Staging ingest for the hand-curated leaf scholarship pack.
 */
require("dotenv").config();

process.env.INGESTION_ENABLED = "true";
process.env.INGEST_DAAD_ENABLED = "false";

const { pool } = require("../../src/infra/db/neonClient");
const { runScholarshipIngestion } = require("../../src/modules/scholarship-ingestion/runScholarshipIngestion");
const { ScholarshipIngestionRepository } = require("../../src/repositories/ScholarshipIngestionRepository");
const { runScript } = require("../lib/run");

async function main() {
  const ingest = await runScholarshipIngestion({ source: "curated_leaf" });
  // eslint-disable-next-line no-console
  console.log("Curated leaf ingest:", JSON.stringify(ingest, null, 2));

  runScript("promote-quality-scholarships.js");

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
