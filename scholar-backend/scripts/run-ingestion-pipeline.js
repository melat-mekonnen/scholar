/**
 * Full ingestion pipeline: capture → stage → publish.
 * Phase 1 curated floor + optional Africa-scale sources.
 *
 * Usage:
 *   node scripts/run-ingestion-pipeline.js
 *   node scripts/run-ingestion-pipeline.js --source=phase1
 *   node scripts/run-ingestion-pipeline.js --source=africa
 */
require("dotenv").config();

process.env.INGESTION_ENABLED = "true";
process.env.INGEST_PIPELINE_MODE = process.env.INGEST_PIPELINE_MODE || "staging";
process.env.INGEST_DEDUP_MODE = process.env.INGEST_DEDUP_MODE || "merge";

const { pool } = require("../src/infra/db/neonClient");
const { runScholarshipIngestion } = require("../src/modules/scholarship-ingestion/runScholarshipIngestion");
const { ScholarshipIngestionRepository } = require("../src/repositories/ScholarshipIngestionRepository");
const { ScholarshipStagingRepository } = require("../src/repositories/ScholarshipStagingRepository");

function parseArg(name, fallback) {
  const arg = process.argv.find((part) => part.startsWith(`--${name}=`));
  if (!arg) return fallback;
  return arg.slice(name.length + 3);
}

async function main() {
  const source = parseArg("source", "phase1,africa");

  const result = await runScholarshipIngestion({ source });
  // eslint-disable-next-line no-console
  console.log("Pipeline result:", JSON.stringify(result, null, 2));

  const stagingRepo = new ScholarshipStagingRepository();
  const stagingCounts = await stagingRepo.countByStatus();
  // eslint-disable-next-line no-console
  console.log("Staging counts:", stagingCounts);

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
