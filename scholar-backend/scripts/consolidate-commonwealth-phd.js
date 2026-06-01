/**
 * Consolidate per-country Commonwealth PhD cards into one listing and re-export CSV.
 *
 * Usage:
 *   node scripts/consolidate-commonwealth-phd.js
 */
require("dotenv").config();

const { pool, query } = require("../src/infra/db/neonClient");
const { ScholarshipRepository } = require("../src/repositories/ScholarshipRepository");
const {
  commonwealthPhdNominatorLeafProgrammes,
  COMMONWEALTH_PHD_CONSOLIDATED_EXTERNAL_ID,
} = require("../src/modules/scholarship-ingestion/leafProgrammes/commonwealthNominators");
const { buildLeafProgrammeRecord } = require("../src/modules/scholarship-ingestion/leafProgrammes/buildLeafProgrammeRecord");
const { normalizeScholarshipRecord } = require("../src/modules/scholarship-ingestion/normalizeScholarship");
const { exportVisibleCsv } = require("./export-visible-scholarships-csv");

const SOURCE = "PHASE1_CURATED";

async function dedupePerCountryPhdRows() {
  const result = await query(
    `UPDATE scholarships
     SET status = 'duplicate',
         rejection_reason = 'consolidated_commonwealth_phd_single_card',
         updated_at = NOW()
     WHERE status IN ('verified', 'needs_review', 'pending')
       AND (
         (external_id LIKE 'commonwealth-phd-%' AND external_id <> $1)
         OR title ~ '^Commonwealth PhD Scholarship — .+ \\(via national nominator\\)$'
       )
     RETURNING id, title, external_id`,
    [COMMONWEALTH_PHD_CONSOLIDATED_EXTERNAL_ID],
  );
  return result.rows;
}

async function upsertConsolidatedCard(repo) {
  const [programme] = commonwealthPhdNominatorLeafProgrammes();
  const raw = buildLeafProgrammeRecord(programme);
  const normalized = normalizeScholarshipRecord({ ...raw, sourceName: SOURCE });

  await repo.upsertImportedScholarship({
    title: normalized.title,
    organizationName: normalized.organizationName,
    country: normalized.country,
    hostCountry: normalized.hostCountry,
    degreeLevel: normalized.degreeLevel,
    fieldOfStudy: normalized.fieldOfStudy,
    fundingType: normalized.fundingType,
    deadline: normalized.deadline,
    applicationStartDate: normalized.applicationStartDate,
    applicationEndDate: normalized.applicationEndDate,
    amount: normalized.amount,
    description: normalized.description,
    applicationUrl: normalized.applicationUrl,
    sourceName: SOURCE,
    sourceUrl: normalized.sourceUrl,
    externalId: normalized.externalId,
    publishStatus: "verified",
    isRolling: normalized.isRolling ?? true,
    eligibleRegions: normalized.eligibleRegions,
    normalizedSourceUrl: normalized.normalizedSourceUrl,
    qualityScore: 85,
  });

  return normalized;
}

async function main() {
  const repo = new ScholarshipRepository();
  const consolidated = await upsertConsolidatedCard(repo);
  const deduped = await dedupePerCountryPhdRows();
  const csv = await exportVisibleCsv();

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        consolidated: {
          externalId: consolidated.externalId,
          title: consolidated.title,
          applicationUrl: consolidated.applicationUrl,
        },
        dedupedPerCountryRows: deduped.length,
        dedupedSample: deduped.slice(0, 5).map((row) => row.title),
        csvPath: csv.outPath,
        csvRows: csv.rows,
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
