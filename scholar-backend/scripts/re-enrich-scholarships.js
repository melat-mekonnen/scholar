/**
 * Re-fetch official pages and update description/deadline for imported scholarships.
 * Usage: node scripts/re-enrich-scholarships.js
 */
require("dotenv").config();
const { query, pool } = require("../src/infra/db/neonClient");
const { fetchOfficialPageMetadataWithRetry } = require("../src/modules/scholarship-ingestion/connectors/fetchOfficialPageMetadata");
const { hasRollingDeadline } = require("../src/modules/scholarship-ingestion/qualityGate");
const { parseEligibleRegions } = require("../src/modules/scholarship-ingestion/africaEligibility");
const { resolveIngestionTier } = require("../src/modules/scholarship-ingestion/govTrustedDomains");
const { normalizeUrl } = require("../src/modules/scholarship-ingestion/urlNormalize");
const { shouldAcceptEnrichedDescription } = require("../src/modules/scholarship-ingestion/descriptionQuality");

async function main() {
  const { rows } = await query(
    `SELECT id, title, application_url, source_url, description
     FROM scholarships
     WHERE (application_url IS NOT NULL AND application_url <> '')
        OR (source_url IS NOT NULL AND source_url <> '')
     ORDER BY updated_at DESC
     LIMIT 100`,
  );

  let updated = 0;
  for (const row of rows) {
    const url = row.application_url || row.source_url;
    if (!url || !/^https?:\/\//i.test(url)) continue;
    try {
      // eslint-disable-next-line no-await-in-loop
      const meta = await fetchOfficialPageMetadataWithRetry(url, { retries: 1 });
      if (!meta?.descriptionFromSite || !shouldAcceptEnrichedDescription(row.description, meta?.description)) {
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      const enriched = {
        title: row.title,
        description: meta.description,
        deadline: meta.deadline || null,
        fundingType: meta.fundingType || null,
        applicationUrl: url,
        sourceUrl: row.source_url || url,
      };
      const isRolling = hasRollingDeadline(enriched);
      const eligibleRegions = parseEligibleRegions(meta.description);
      const ingestionTier = resolveIngestionTier({ sourceUrl: row.source_url || url });
      const normalizedSourceUrl = normalizeUrl(row.source_url || url);
      await query(
        `UPDATE scholarships
         SET description = $2,
             deadline = COALESCE($3, deadline),
             funding_type = COALESCE($4, funding_type),
             is_rolling = $5,
             eligible_regions = CASE
               WHEN COALESCE(array_length($6::text[], 1), 0) > 0 THEN $6
               ELSE eligible_regions
             END,
             ingestion_tier = COALESCE($7, ingestion_tier),
             normalized_source_url = COALESCE($8, normalized_source_url),
             updated_at = NOW()
         WHERE id = $1`,
        [
          row.id,
          meta.description,
          meta.deadline || null,
          meta.fundingType || null,
          isRolling,
          eligibleRegions,
          ingestionTier,
          normalizedSourceUrl,
        ],
      );
      updated += 1;
      // eslint-disable-next-line no-console
      console.log("Updated:", row.title);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("Skip:", row.title, err.message);
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Done. Enriched ${updated} of ${rows.length} scholarships.`);
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
