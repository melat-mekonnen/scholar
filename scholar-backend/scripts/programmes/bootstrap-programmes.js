/**
 * Bootstrap study programmes: seed, crawl Warwick, link to scholarships.
 */
require("dotenv").config();

const { pool } = require("../../src/infra/db/neonClient");
const { runScript } = require("../lib/run");

const MIN_PROGRAMMES = Number(process.env.MIN_VERIFIED_PROGRAMMES || 7);
const MIN_LINKS = Number(process.env.MIN_PROGRAMME_SCHOLARSHIP_LINKS || 1);

async function main() {
  runScript("programmes/seed-study-programmes.js");
  runScript("programmes/crawl-warwick-programmes.js", "--max=25");
  runScript("programmes/link-to-scholarships.js");

  const counts = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM study_programmes WHERE status = 'verified') AS programmes,
       (SELECT COUNT(*)::int FROM programme_scholarships) AS programme_links`,
  );
  const row = counts.rows[0];
  // eslint-disable-next-line no-console
  console.log("Programmes bootstrap:", row);

  if (Number(row.programmes) < MIN_PROGRAMMES || Number(row.programme_links) < MIN_LINKS) {
    // eslint-disable-next-line no-console
    console.error(
      `Programmes bootstrap incomplete: programmes=${row.programmes} (min ${MIN_PROGRAMMES}), links=${row.programme_links} (min ${MIN_LINKS})`,
    );
    process.exitCode = 1;
  } else {
    // eslint-disable-next-line no-console
    console.log(`Programmes bootstrap complete: ${row.programmes} programmes, ${row.programme_links} links.`);
  }

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
