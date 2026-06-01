/**
 * Fix ADB-JSP listing: point hub to institutions page and import partner university programme URLs.
 *
 * Usage:
 *   node scripts/import-adb-jsp-institutions.js
 *   node scripts/import-adb-jsp-institutions.js --dry-run
 */
require("dotenv").config();

const { pool, query } = require("../src/infra/db/neonClient");
const { ScholarshipRepository } = require("../src/repositories/ScholarshipRepository");
const {
  fetchInstitutionProgrammes,
  toImportRecord,
  mainProgrammeRecord,
  isGenericFacultyHomepage,
  INSTITUTIONS_HUB,
} = require("../src/modules/scholarship-ingestion/connectors/adbJspInstitutionsParser");
const { normalizeUrl } = require("../src/modules/scholarship-ingestion/urlNormalize");

const SOURCE_NAME = "ADB_JSP_INSTITUTIONS";
const OLD_APPLY =
  "https://www.adb.org/work-with-us/careers/japan-scholarship-program";

function parseBool(name) {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const dryRun = parseBool("dry-run");
  const programmes = await fetchInstitutionProgrammes();
  const hub = mainProgrammeRecord();

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({ partnerProgrammes: programmes.length, hubApply: hub.applicationUrl }, null, 2),
  );

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ sample: programmes.slice(0, 5) }, null, 2));
    await pool.end();
    return;
  }

  const repo = new ScholarshipRepository();

  await repo.upsertImportedScholarship({
    title: hub.title,
    organizationName: hub.organizationName,
    country: hub.country,
    degreeLevel: hub.degreeLevel,
    fieldOfStudy: hub.fieldOfStudy,
    fundingType: hub.fundingType,
    description: hub.description,
    applicationUrl: hub.applicationUrl,
    sourceName: "Asian Development Bank",
    sourceUrl: hub.sourceUrl,
    externalId: hub.externalId,
    publishStatus: "verified",
    isRolling: hub.isRolling,
    eligibleRegions: hub.eligibleRegions,
    ingestionTier: hub.ingestionTier,
    normalizedSourceUrl: normalizeUrl(hub.sourceUrl),
    qualityScore: 85,
  });

  const existing = await query(
    `SELECT id, title, application_url
     FROM scholarships
     WHERE source_name = $1
       AND status IN ('verified', 'needs_review')`,
    [SOURCE_NAME],
  );
  for (const row of existing.rows) {
    const linkTitle = String(row.title || "").replace(/^ADB-JSP — /i, "");
    if (row.application_url === "https://www.t.kyoto-u.ac.jp/en") {
      // eslint-disable-next-line no-await-in-loop
      await query(
        `UPDATE scholarships SET status = 'rejected', rejection_reason = 'adb_jsp_faculty_homepage_not_apply', updated_at = NOW() WHERE id = $1`,
        [row.id],
      );
      continue;
    }
    if (!isGenericFacultyHomepage(row.application_url, linkTitle)) continue;
    // eslint-disable-next-line no-await-in-loop
    await query(
      `UPDATE scholarships
       SET status = 'rejected',
           rejection_reason = 'adb_jsp_generic_faculty_homepage_not_apply',
           updated_at = NOW()
       WHERE id = $1`,
      [row.id],
    );
  }

  const retired = await query(
    `UPDATE scholarships
     SET status = 'rejected',
         rejection_reason = 'replaced_by_adb_jsp_institutions_hub',
         updated_at = NOW()
     WHERE application_url = $1
       AND external_id IS DISTINCT FROM $2
     RETURNING id, title`,
    [OLD_APPLY, hub.externalId],
  );

  let upserted = 0;
  for (const item of programmes) {
    const raw = toImportRecord(item);
    // eslint-disable-next-line no-await-in-loop
    await repo.upsertImportedScholarship({
      title: raw.title,
      organizationName: raw.organizationName,
      country: raw.country,
      degreeLevel: raw.degreeLevel,
      fieldOfStudy: raw.fieldOfStudy,
      fundingType: raw.fundingType,
      description: raw.description,
      applicationUrl: raw.applicationUrl,
      sourceName: SOURCE_NAME,
      sourceUrl: raw.sourceUrl,
      externalId: raw.externalId,
      publishStatus: "verified",
      isRolling: raw.isRolling,
      deadline: raw.deadline,
      applicationStatus: raw.applicationStatus,
      eligibleRegions: raw.eligibleRegions,
      ingestionTier: raw.ingestionTier,
      normalizedSourceUrl: normalizeUrl(raw.sourceUrl),
      qualityScore: 82,
    });
    upserted += 1;
  }

  await query(
    `UPDATE scholarships
     SET is_rolling = FALSE
     WHERE source_name = $1
       AND LOWER(COALESCE(application_status, '')) = 'closed'`,
    [SOURCE_NAME],
  );

  const visible = await query(
    `SELECT COUNT(*)::int AS n
     FROM scholarships
     WHERE status = 'verified'
       AND COALESCE(record_type, 'scholarship') = 'scholarship'
       AND LOWER(COALESCE(application_status, '')) <> 'closed'
       AND (deadline IS NULL OR deadline >= CURRENT_DATE OR is_rolling = TRUE)`,
  );

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        hubUrl: INSTITUTIONS_HUB,
        partnerUpserted: upserted,
        retiredOldApplyUrl: retired.rows.length,
        visible: visible.rows[0]?.n,
      },
      null,
      2,
    ),
  );

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
