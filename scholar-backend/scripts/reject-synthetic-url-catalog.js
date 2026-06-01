/**
 * Remove URL_CATALOG rows created with fabricated template text (no real page fetch).
 */
require("dotenv").config();

const { query, pool } = require("../src/infra/db/neonClient");
const {
  isPortalLandingUrl,
  isListingHubUrl,
  isBareHomepageUrl,
  isSyntheticImportDescription,
} = require("../src/modules/scholarship-ingestion/descriptionQuality");

async function main() {
  const { rows } = await query(
    `SELECT id, title, description, application_url, source_url
     FROM scholarships
     WHERE source_name = 'URL_CATALOG'
       AND status IN ('verified', 'needs_review', 'pending')`,
  );

  const ids = [];
  for (const row of rows) {
    const bad =
      isSyntheticImportDescription(row.description) ||
      isPortalLandingUrl(row.application_url) ||
      isPortalLandingUrl(row.source_url) ||
      isBareHomepageUrl(row.application_url) ||
      isListingHubUrl(row.application_url) ||
      isListingHubUrl(row.source_url) ||
      /—\s*scholarship programme$/i.test(String(row.title || ""));
    if (bad) ids.push(row.id);
  }

  if (ids.length) {
    await query(
      `UPDATE scholarships SET status = 'rejected', updated_at = NOW() WHERE id = ANY($1::uuid[])`,
      [ids],
    );
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ scanned: rows.length, rejected: ids.length }, null, 2));
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
