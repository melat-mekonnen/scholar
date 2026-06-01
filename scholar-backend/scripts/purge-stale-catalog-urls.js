/**
 * Reject verified curated rows whose apply URLs no longer match the leaf catalog.
 * Run after `npm run scholarships:sync-catalog` when URLs are corrected in code.
 */
require("dotenv").config();

const { query, pool } = require("../src/infra/db/neonClient");
const {
  buildLeafImportRecords,
  scrapeProgrammesWithDescriptions,
} = require("../src/modules/scholarship-ingestion/leafProgrammes/assembleLeafCatalog");
const { buildLeafProgrammeRecord } = require("../src/modules/scholarship-ingestion/leafProgrammes/buildLeafProgrammeRecord");
const {
  baseUrlWithoutHash,
  isGenericMultiCountryApplyPortal,
  isCscSharedGenericUrl,
  isCommonwealthSharedRecord,
} = require("../src/modules/scholarship-ingestion/leafProgrammes/leafApplyUrl");
const { CURATED_LEAF_SOURCE } = require("../src/modules/scholarship-ingestion/sourceNames");

function scrapeRecords() {
  return scrapeProgrammesWithDescriptions()
    .map((programme) =>
      buildLeafProgrammeRecord({
        externalId: programme.externalId,
        title: programme.titleHint || programme.externalId,
        organizationName: programme.organizationName,
        country: programme.country,
        degreeLevel: programme.degreeLevel,
        fieldOfStudy: programme.fieldOfStudy || "multiple disciplines",
        fundingType: programme.fundingType || "fully_funded",
        url: programme.url,
        description: `${programme.curatedDescription || programme.titleHint}. ${"x".repeat(120)}`,
        descriptionFromSite: false,
      }),
    )
    .filter(Boolean);
}

async function main() {
  const catalog = [...buildLeafImportRecords(), ...scrapeRecords()];
  const byExternalId = new Map(catalog.map((row) => [row.externalId, row]));

  const { rows } = await query(
    `SELECT id, title, external_id, application_url, source_url
     FROM scholarships
     WHERE source_name = $1
       AND status = 'verified'`,
    [CURATED_LEAF_SOURCE],
  );

  const staleIds = [];
  for (const row of rows) {
    const expected = byExternalId.get(row.external_id);
    const apply = row.application_url || "";
    const deprecatedPattern =
      /#course-/i.test(apply) ||
      /#course-/i.test(row.source_url || "") ||
      isGenericMultiCountryApplyPortal(apply) ||
      (isCommonwealthSharedRecord(row.external_id) && isCscSharedGenericUrl(apply));

    if (deprecatedPattern) {
      staleIds.push(row.id);
      continue;
    }

    if (
      expected &&
      baseUrlWithoutHash(expected.applicationUrl) !== baseUrlWithoutHash(apply)
    ) {
      staleIds.push(row.id);
    }
  }

  if (staleIds.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No stale curated URL rows to reject.");
    await pool.end();
    return;
  }

  const result = await query(
    `UPDATE scholarships
     SET status = 'rejected',
         rejection_reason = 'stale apply URL — superseded by catalog sync',
         updated_at = NOW()
     WHERE id = ANY($1::uuid[])
     RETURNING id, title, application_url`,
    [staleIds],
  );

  // eslint-disable-next-line no-console
  console.log(`Rejected ${result.rowCount} stale curated row(s).`);
  for (const row of result.rows.slice(0, 15)) {
    // eslint-disable-next-line no-console
    console.log(`  - ${row.title} (${row.application_url})`);
  }
  if (result.rowCount > 15) {
    // eslint-disable-next-line no-console
    console.log(`  ... and ${result.rowCount - 15} more`);
  }

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
