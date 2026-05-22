/**
 * Expand configured leaf catalog and discover UK university funding pages.
 */
require("dotenv").config();

const { pool } = require("../../src/infra/db/neonClient");
const { catalogSummary } = require("../../src/modules/scholarship-ingestion/leafProgrammes/assembleLeafCatalog");
const { ukFundingDiscoverySourceNames } = require("../../src/modules/scholarship-ingestion/sourceNames");
const { runScript } = require("../lib/run");

const MIN_CONFIGURED = Number(process.env.MIN_CONFIGURED_LEAVES || 300);
const MIN_VERIFIED = Number(process.env.MIN_VERIFIED_SCHOLARSHIPS || 280);

async function main() {
  const summary = catalogSummary();
  // eslint-disable-next-line no-console
  console.log("Leaf catalog configured:", JSON.stringify(summary));

  if (summary.totalConfigured < MIN_CONFIGURED) {
    // eslint-disable-next-line no-console
    console.error(
      `Catalog too small: ${summary.totalConfigured} configured (target ${MIN_CONFIGURED})`,
    );
    process.exitCode = 1;
    return;
  }

  runScript("scholarships/sync-leaf-catalog.js");
  runScript("scholarships/crawl-uk-funding-pages.js", "--max-per-hub=4");

  const ukSources = ukFundingDiscoverySourceNames();
  const counts = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM scholarships
        WHERE status = 'verified'
          AND COALESCE(record_type, 'scholarship') = 'scholarship') AS verified_scholarships,
       (SELECT COUNT(*)::int FROM scholarships
        WHERE source_name = ANY($1::text[]) AND status = 'verified') AS uk_funding_discovered`,
    [ukSources],
  );
  const row = counts.rows[0];
  // eslint-disable-next-line no-console
  console.log("Expand catalog:", row);

  if (Number(row.verified_scholarships) < MIN_VERIFIED) {
    // eslint-disable-next-line no-console
    console.error(
      `Expand incomplete: ${row.verified_scholarships} verified scholarships (target ${MIN_VERIFIED})`,
    );
    process.exitCode = 1;
  } else {
    // eslint-disable-next-line no-console
    console.log(`Expand complete: ${row.verified_scholarships} verified scholarship leaves.`);
  }

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
