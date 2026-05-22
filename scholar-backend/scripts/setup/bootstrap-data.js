/**
 * Production bootstrap: verified catalog → expanded catalog → enriched content → programmes.
 */
require("dotenv").config();

const { pool } = require("../../src/infra/db/neonClient");
const { runScript } = require("./lib/run");

process.env.INGESTION_ENABLED = "true";
process.env.INGEST_DAAD_ENABLED = "false";

async function main() {
  runScript("scholarships/bootstrap-verified-catalog.js");
  runScript("scholarships/expand-catalog.js");
  runScript("scholarships/verify-enriched-content.js");
  runScript("programmes/bootstrap-programmes.js");

  const count = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM scholarships WHERE status = 'verified') AS verified_scholarships,
       (SELECT COUNT(*)::int FROM study_programmes WHERE status = 'verified') AS verified_programmes,
       (SELECT COUNT(*)::int FROM programme_scholarships) AS programme_links`,
  );
  // eslint-disable-next-line no-console
  console.log("Bootstrap complete:", count.rows[0]);
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
