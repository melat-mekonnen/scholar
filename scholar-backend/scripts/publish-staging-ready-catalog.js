/**
 * Publish all staging rows in ready/captured/validated state (batched).
 */
require("dotenv").config();

process.env.INGESTION_ENABLED = "true";
process.env.INGEST_DEDUP_MODE = process.env.INGEST_DEDUP_MODE || "merge";

const { pool } = require("../src/infra/db/neonClient");
const { publishFromStaging } = require("../src/modules/scholarship-ingestion/pipeline/publishFromStaging");

async function main() {
  const maxBatches = Number(process.env.STAGING_PUBLISH_MAX_BATCHES || 20);
  const batchSize = Number(process.env.STAGING_PUBLISH_BATCH_SIZE || 500);
  const summaries = [];

  for (let i = 0; i < maxBatches; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const result = await publishFromStaging({ limit: batchSize });
    summaries.push(result);
    if (!result.staged) break;
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        batches: summaries.length,
        totalStaged: summaries.reduce((n, s) => n + (s.staged || 0), 0),
        totalPublished: summaries.reduce((n, s) => n + (s.published || 0), 0),
        totalVerified: summaries.reduce((n, s) => n + (s.verified || 0), 0),
        totalNeedsReview: summaries.reduce((n, s) => n + (s.needsReview || 0), 0),
        totalQuarantined: summaries.reduce((n, s) => n + (s.quarantined || 0), 0),
        lastStagingCounts: summaries.at(-1)?.stagingCounts || [],
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
