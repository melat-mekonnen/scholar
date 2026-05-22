/**
 * Remove UK funding discovery crawl rows that duplicate curated Shared Scholarship
 * cards or point at generic CSC / off-site / fragment junk URLs.
 */
require("dotenv").config();

const { query, pool } = require("../src/infra/db/neonClient");
const { isCscSharedGenericUrl } = require("../src/modules/scholarship-ingestion/leafProgrammes/leafApplyUrl");
const { ukFundingDiscoverySourceNames } = require("../src/modules/scholarship-ingestion/sourceNames");

function isBursaryJunk(row) {
  const apply = String(row.application_url || "");
  const externalId = String(row.external_id || "");
  const title = String(row.title || "");

  if (!externalId.startsWith("bursary-")) return false;

  if (/cscuk\.fcdo\.gov\.uk/i.test(apply)) return true;
  if (/linkedin\.com/i.test(apply)) return true;
  if (isCscSharedGenericUrl(apply)) return true;
  if (/#/.test(apply) && !/#nominator-/i.test(apply)) return true;
  if (/commonwealth shared scholarships applications/i.test(title)) return true;

  const slugMatch = externalId.match(/^bursary-([a-z0-9-]+)-/);
  if (slugMatch) return true;

  return false;
}

async function main() {
  const ukSources = ukFundingDiscoverySourceNames();
  const { rows } = await query(
    `SELECT id, title, application_url, external_id, source_name, status
     FROM scholarships
     WHERE status IN ('verified', 'pending', 'needs_review')
       AND (
         external_id LIKE 'bursary-%'
         OR source_name = ANY($1::text[])
       )`,
    [ukSources],
  );

  const junk = rows.filter(isBursaryJunk);
  if (junk.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No UK funding bursary junk rows to reject.");
    await pool.end();
    return;
  }

  const result = await query(
    `UPDATE scholarships
     SET status = 'rejected',
         rejection_reason = 'UK funding crawl duplicate or generic CSC/off-site URL',
         updated_at = NOW()
     WHERE id = ANY($1::uuid[])
     RETURNING id, title, application_url`,
    [junk.map((r) => r.id)],
  );

  // eslint-disable-next-line no-console
  console.log(`Rejected ${result.rowCount} UK funding bursary junk row(s):`);
  for (const row of result.rows) {
    // eslint-disable-next-line no-console
    console.log(`  - ${row.title}`);
    // eslint-disable-next-line no-console
    console.log(`    ${row.application_url}`);
  }

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
