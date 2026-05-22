/**
 * Phase 2 — discover US aggregator articles, resolve official URLs, stage for admin review.
 *
 * Blocklisted domains (scholarshiptab.com, uscholarships.us, scholarshipunion.com) are
 * discovery-only; rows never auto-verify from aggregator pages.
 */
require("dotenv").config();

process.env.INGESTION_ENABLED = "true";
process.env.INGEST_US_AGGREGATOR_DISCOVERY_ENABLED = "true";
process.env.INGEST_DAAD_ENABLED = "false";

const { pool } = require("../../src/infra/db/neonClient");
const { runScholarshipIngestion } = require("../../src/modules/scholarship-ingestion/runScholarshipIngestion");
const { ScholarshipIngestionRepository } = require("../../src/repositories/ScholarshipIngestionRepository");
const { runScript } = require("../lib/run");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const ingest = await runScholarshipIngestion({ source: "us_aggregator_discovery" });
  // eslint-disable-next-line no-console
  console.log("US aggregator discovery ingest:", JSON.stringify(ingest, null, 2));

  runScript("promote-quality-scholarships.js");

  const ingestionRepo = new ScholarshipIngestionRepository();
  const health = await ingestionRepo.listSourceHealth();
  // eslint-disable-next-line no-console
  console.log("Source health:", JSON.stringify(health, null, 2));

  // Background Amharic translation may still be running after publish.
  await sleep(3000);
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
