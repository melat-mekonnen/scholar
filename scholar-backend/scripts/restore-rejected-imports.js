/**
 * Move rejected imported scholarships back to pending so they can be re-ingested
 * with the fixed pipeline (one programme URL = one listing).
 *
 * Usage:
 *   node scripts/restore-rejected-imports.js
 *   node scripts/restore-rejected-imports.js --source=AFRICAN_MINISTRIES,COMMONWEALTH
 */
require("dotenv").config();

const { query, pool } = require("../src/infra/db/neonClient");

function parseSourcesArg() {
  const arg = process.argv.find((p) => p.startsWith("--source="));
  if (!arg) return null;
  return arg
    .slice("--source=".length)
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

async function main() {
  const sources = parseSourcesArg();
  const params = [];
  let where = `status = 'rejected' AND source_name IS NOT NULL`;

  if (sources?.length) {
    params.push(sources);
    where += ` AND source_name = ANY($1::text[])`;
  }

  const result = await query(
    `UPDATE scholarships
     SET status = 'pending', updated_at = NOW()
     WHERE ${where}
     RETURNING id, title, source_name`,
    params,
  );

  // eslint-disable-next-line no-console
  console.log(`Restored ${result.rows.length} scholarship(s) to pending.`);
  for (const row of result.rows) {
    // eslint-disable-next-line no-console
    console.log(`  - [${row.source_name}] ${row.title}`);
  }

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
