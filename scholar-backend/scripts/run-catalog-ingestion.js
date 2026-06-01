/**
 * Unified catalog ingestion entrypoint.
 *
 * Examples:
 *   node scripts/run-catalog-ingestion.js --source=africa
 *   node scripts/run-catalog-ingestion.js --source=phase1 --promote=true
 *   node scripts/run-catalog-ingestion.js --source=phase1,africa --mode=staging --show-staging=true
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { execSync } = require("child_process");
const { pool } = require("../src/infra/db/neonClient");
const { ScholarshipIngestionRepository } = require("../src/repositories/ScholarshipIngestionRepository");
const { ScholarshipStagingRepository } = require("../src/repositories/ScholarshipStagingRepository");

function loadIngestionRunner() {
  for (const mod of [
    "../src/config/env",
    "../src/modules/scholarship-ingestion/sourceRegistry",
    "../src/modules/scholarship-ingestion/runScholarshipIngestion",
  ]) {
    delete require.cache[require.resolve(mod)];
  }
  return require("../src/modules/scholarship-ingestion/runScholarshipIngestion");
}

function parseArg(name, fallback) {
  const arg = process.argv.find((part) => part.startsWith(`--${name}=`));
  if (!arg) return fallback;
  return arg.slice(name.length + 3);
}

function parseBool(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function printUsage() {
  // eslint-disable-next-line no-console
  console.log(`Usage:
  node scripts/run-catalog-ingestion.js [--source=africa|phase1|all|csv] [--mode=staging|direct]
                                        [--publishStatus=verified|needs_review]
                                        [--promote=true|false] [--show-health=true|false]
                                        [--show-staging=true|false]

Examples:
  node scripts/run-catalog-ingestion.js --source=africa
  node scripts/run-catalog-ingestion.js --source=phase1 --promote=true
  node scripts/run-catalog-ingestion.js --source=phase1,africa --mode=staging --show-staging=true
`);
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printUsage();
    return;
  }

  const source = parseArg("source", "africa");
  const mode = parseArg("mode", process.env.INGEST_PIPELINE_MODE || "staging").toLowerCase();
  const publishStatus = parseArg("publishStatus", "") || null;
  const promote = parseBool(parseArg("promote", ""), false);
  const showHealth = parseBool(parseArg("show-health", "true"), true);
  const showStaging = parseBool(parseArg("show-staging", "false"), false);

  process.env.INGESTION_ENABLED = "true";
  process.env.INGEST_PIPELINE_MODE = mode === "direct" ? "direct" : "staging";
  process.env.INGEST_DEDUP_MODE = process.env.INGEST_DEDUP_MODE || "merge";

  const sourceKeys = String(source || "")
    .split(",")
    .map((s) => s.trim().toLowerCase());
  if (sourceKeys.some((s) => s === "africa" || s === "africa_scale" || s.startsWith("african_"))) {
    process.env.INGEST_DAAD_ENABLED = "false";
    process.env.INGEST_AFRICAN_MINISTRIES_ENABLED = "true";
    process.env.INGEST_AFRICAN_UNIVERSITIES_ENABLED = "true";
    process.env.INGEST_AFRICAN_AGGREGATORS_ENABLED = "true";
    process.env.INGEST_AFRICAN_RESEARCH_ENABLED = "true";
  }

  const { runScholarshipIngestion } = loadIngestionRunner();
  const result = await runScholarshipIngestion({
    source,
    forcePublishStatus: publishStatus,
  });
  // eslint-disable-next-line no-console
  console.log("Ingestion result:", JSON.stringify(result, null, 2));

  if (promote) {
    execSync("node scripts/promote-quality-scholarships.js", {
      stdio: "inherit",
      env: process.env,
    });
  }

  if (showStaging) {
    const stagingRepo = new ScholarshipStagingRepository();
    const stagingCounts = await stagingRepo.countByStatus();
    // eslint-disable-next-line no-console
    console.log("Staging counts:", stagingCounts);
  }

  if (showHealth) {
    const ingestionRepo = new ScholarshipIngestionRepository();
    const health = await ingestionRepo.listSourceHealth();
    // eslint-disable-next-line no-console
    console.log("Source health:", JSON.stringify(health, null, 2));
  }
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Catalog ingestion failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
