/**
 * Re-fetch each scholarship's official source_url and update description from that page only.
 */
require("dotenv").config();
const { query, pool } = require("../src/infra/db/neonClient");
const { fetchOfficialPageMetadataWithRetry } = require("../src/modules/scholarship-ingestion/connectors/fetchOfficialPageMetadata");
const { shouldAcceptEnrichedDescription } = require("../src/modules/scholarship-ingestion/descriptionQuality");

async function main() {
  const { rows } = await query(
    `SELECT id, title, source_url, application_url, description
     FROM scholarships
     WHERE source_url IS NOT NULL AND source_url <> ''
     ORDER BY updated_at DESC`,
  );

  let updated = 0;
  let skipped = 0;
  let cleared = 0;

  for (const row of rows) {
    const url = row.source_url || row.application_url;
    if (!url) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      const page = await fetchOfficialPageMetadataWithRetry(url, { retries: 2 });
      if (!page?.descriptionFromSite || !page.description) {
        skipped += 1;
        // eslint-disable-next-line no-console
        console.warn("No site description:", row.title);
        continue;
      }
      if (!shouldAcceptEnrichedDescription(row.description, page.description)) {
        skipped += 1;
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await query(
        `UPDATE scholarships
         SET description = $2,
             title = CASE WHEN LENGTH($3) > 8 THEN $3 ELSE title END,
             deadline = COALESCE($4, deadline),
             funding_type = COALESCE($5, funding_type),
             updated_at = NOW()
         WHERE id = $1`,
        [row.id, page.description, page.title || row.title, page.deadline, page.fundingType],
      );
      updated += 1;
      // eslint-disable-next-line no-console
      console.log("Updated from site:", row.title);
    } catch (err) {
      skipped += 1;
      // eslint-disable-next-line no-console
      console.warn("Failed:", row.title, err.message);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Updated ${updated}, skipped ${skipped}, total ${rows.length}`);
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
