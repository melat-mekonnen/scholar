/**
 * Hide bad imports (listing pages, 404s, mixed programmes) from Browse.
 * Default: status -> pending (recoverable via npm run restore:imports).
 * Pass --reject to mark status rejected instead.
 */
require("dotenv").config();

const { query, pool } = require("../src/infra/db/neonClient");
const {
  isPollutedDescription,
  isLowQualityTitle,
  isListingHubUrl,
} = require("../src/modules/scholarship-ingestion/descriptionQuality");

async function main() {
  const { rows } = await query(
    `SELECT id, title, description, source_url, application_url, status, source_name
     FROM scholarships
     WHERE status IN ('verified', 'pending')
     ORDER BY updated_at DESC`,
  );

  const toReject = [];
  for (const row of rows) {
    const polluted =
      isPollutedDescription(row.description) ||
      isLowQualityTitle(row.title) ||
      isListingHubUrl(row.source_url) ||
      isListingHubUrl(row.application_url);
    if (polluted) toReject.push(row);
  }

  if (toReject.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No polluted scholarships found.");
    await pool.end();
    return;
  }

  const useRejected = process.argv.includes("--reject");
  const nextStatus = useRejected ? "rejected" : "pending";
  const ids = toReject.map((r) => r.id);
  await query(
    `UPDATE scholarships
     SET status = $2, updated_at = NOW()
     WHERE id = ANY($1::uuid[])`,
    [ids, nextStatus],
  );

  // eslint-disable-next-line no-console
  console.log(`Marked ${toReject.length} polluted listing(s) as ${nextStatus}:`);
  for (const row of toReject) {
    // eslint-disable-next-line no-console
    console.log(`  - [${row.source_name}] ${row.title}`);
  }

  const { rows: counts } = await query(
    `SELECT status, COUNT(*)::int AS n FROM scholarships GROUP BY status ORDER BY status`,
  );
  // eslint-disable-next-line no-console
  console.log("Counts:", counts);

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
