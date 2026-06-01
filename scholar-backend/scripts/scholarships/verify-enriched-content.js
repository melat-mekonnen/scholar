/**
 * Enrich verified scholarships: fetch official pages and write sectioned descriptions.
 */
require("dotenv").config();

const { pool } = require("../../src/infra/db/neonClient");
const { runScript } = require("../lib/run");

async function main() {
  runScript("scholarships/enrich-descriptions.js", "--all");

  const counts = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM scholarships
        WHERE status = 'verified'
          AND description LIKE '## Overview%') AS sectioned_descriptions,
       (SELECT COUNT(*)::int FROM scholarships
        WHERE status = 'verified'
          AND extracted_facts IS NOT NULL) AS with_extracted_facts,
       (SELECT COUNT(*)::int FROM scholarships WHERE status = 'verified') AS verified_total`,
  );

  const row = counts.rows[0];
  // eslint-disable-next-line no-console
  console.log("Enriched content:", row);

  const minSectioned = Math.floor(Number(row.verified_total) * 0.9);
  if (Number(row.sectioned_descriptions) < minSectioned) {
    // eslint-disable-next-line no-console
    console.error(
      `Content verification failed: ${row.sectioned_descriptions}/${row.verified_total} have sectioned descriptions`,
    );
    process.exitCode = 1;
  } else {
    // eslint-disable-next-line no-console
    console.log(`Content verification passed: ${row.sectioned_descriptions} sectioned descriptions.`);
  }

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
