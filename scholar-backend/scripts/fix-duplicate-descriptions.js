/**
 * Remove polluted hub/boilerplate scholarships and re-import corrected sources.
 * Usage: node scripts/fix-duplicate-descriptions.js
 */
require("dotenv").config();

process.env.INGESTION_ENABLED = "true";
process.env.INGEST_FULBRIGHT_ENABLED = "true";
process.env.INGEST_ERASMUS_ENABLED = "true";
process.env.INGEST_CHEVENING_ENABLED = "true";
process.env.INGEST_DAAD_ENABLED = "true";

const { query, pool } = require("../src/infra/db/neonClient");
const { runScholarshipIngestion } = require("../src/modules/scholarship-ingestion/runScholarshipIngestion");
const { isGenericBoilerplate } = require("../src/modules/scholarship-ingestion/descriptionQuality");

async function main() {
  const removed = await query(
    `DELETE FROM scholarships
     WHERE source_url ~* '^https://us\\.fulbrightonline\\.org/countries/'
        OR title IN ('Studying abroad', 'Scholars', 'Scholars Program', 'Apply')
        OR (source_name = 'ERASMUS' AND title = 'Studying abroad')
        OR (source_name = 'CHEVENING' AND title = 'Scholarships | Chevening')
        OR (source_name = 'MASTERCARD_FOUNDATION' AND title IN ('Scholars', 'Scholars Program'))
        OR (source_name = 'MASTERCARD_FOUNDATION' AND title ILIKE '%Reeta Roy%')
        OR (source_name = 'AFRICAN_MINISTRIES' AND (
          title ILIKE '%ELIMU SCHOLARSHIP%'
          OR description ILIKE '%Open toolbar%'
          OR description ILIKE '%Increase Text Decrease%'
        ))
     RETURNING id, title, source_name`,
  );

  const fixed = await query(
    `UPDATE scholarships
     SET status = 'pending', updated_at = NOW()
     WHERE description IS NOT NULL
       AND (
         description ILIKE '%Fulbright U.S. Student Program provides grants%'
         OR description ILIKE '%Open toolbar Accessibility%'
         OR description ILIKE '%Increase Text Decrease Text%'
       )
     RETURNING id, title`,
  );

  // eslint-disable-next-line no-console
  console.log(`Removed ${removed.rows.length} junk listings`);
  for (const row of removed.rows) {
    // eslint-disable-next-line no-console
    console.log("  -", row.source_name, row.title);
  }

  // eslint-disable-next-line no-console
  console.log(`Marked ${fixed.rows.length} rows pending for re-review (boilerplate text)`);

  const result = await runScholarshipIngestion({
    source: "fulbright,erasmus,chevening,daad",
  });

  // eslint-disable-next-line no-console
  console.log("Re-ingest:", JSON.stringify(result, null, 2));

  const { rows: remaining } = await query(
    `SELECT id, title, source_name, LEFT(description, 100) AS preview
     FROM scholarships
     WHERE description IS NOT NULL AND LENGTH(description) > 50`,
  );

  let boilerplate = 0;
  for (const row of remaining) {
    if (isGenericBoilerplate(row.preview)) boilerplate += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`Remaining listings: ${remaining.length}, boilerplate previews: ${boilerplate}`);
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
