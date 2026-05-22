/**
 * Phase 0 setup: migrate → ingest leaf catalog → reject hub URLs → promote → seed programmes.
 */
require("dotenv").config();

const { execSync } = require("child_process");
const { pool } = require("../src/infra/db/neonClient");

process.env.INGESTION_ENABLED = "true";
process.env.INGEST_DAAD_ENABLED = "false";

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env, cwd: __dirname + "/.." });
}

async function main() {
  run("node scripts/finish-phase0.js");
  run("node scripts/seed-study-programmes.js");
  run("node scripts/refine-scholarship-descriptions.js --limit=200");

  const count = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM scholarships WHERE status = 'verified') AS verified_scholarships,
       (SELECT COUNT(*)::int FROM study_programmes WHERE status = 'verified') AS verified_programmes`,
  );
  // eslint-disable-next-line no-console
  console.log("Counts:", count.rows[0]);
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
