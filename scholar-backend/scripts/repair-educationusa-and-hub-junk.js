/**
 * Reject hub/navigation rows from visible catalog, re-enrich EducationUSA leaf pages,
 * and re-export visible-scholarships-urls.csv.
 *
 * Usage:
 *   node scripts/repair-educationusa-and-hub-junk.js
 *   node scripts/repair-educationusa-and-hub-junk.js --skip-fetch
 */
require("dotenv").config();

const { pool, query } = require("../src/infra/db/neonClient");
const {
  isListingHubUrl,
  isEducationUsaNavigationRecord,
  isPollutedDescription,
  isLowQualityTitle,
} = require("../src/modules/scholarship-ingestion/descriptionQuality");
const {
  fetchHtml,
  parseDetailPage,
  toImportRecord,
} = require("../src/modules/scholarship-ingestion/connectors/educationusaFinancialAidParser");
const { exportVisibleCsv } = require("./export-visible-scholarships-csv");

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isHubRecord(row) {
  if (isEducationUsaNavigationRecord(row)) return true;
  if (isLowQualityTitle(row.title) && isListingHubUrl(row.application_url)) return true;
  if (isListingHubUrl(row.application_url) || isListingHubUrl(row.source_url)) return true;
  if (row.description && isPollutedDescription(row.description) && isListingHubUrl(row.application_url)) {
    return true;
  }
  return false;
}

async function rejectHubJunk() {
  const { rows } = await query(
    `SELECT id, title, description, application_url, source_url, source_name
     FROM scholarships
     WHERE status IN ('verified', 'needs_review', 'pending')`,
  );

  const rejected = [];
  for (const row of rows) {
    if (!isHubRecord(row)) continue;
    // eslint-disable-next-line no-await-in-loop
    await query(
      `UPDATE scholarships
       SET status = 'rejected',
           rejection_reason = 'catalog_hub_navigation_not_programme',
           updated_at = NOW()
       WHERE id = $1`,
      [row.id],
    );
    rejected.push({ id: row.id, title: row.title, applicationUrl: row.application_url });
  }
  return rejected;
}

async function loadEducationUsaRepairRows() {
  const { rows } = await query(
    `SELECT id, title, description, application_url, source_url, organization_name,
            degree_level, field_of_study, deadline, application_start_date,
            application_end_date, is_rolling, external_id
     FROM scholarships
     WHERE status = 'verified'
       AND source_name = 'EDUCATIONUSA_FINANCIAL_AID'
       AND (
         application_url ~ '^https://educationusa\\.state\\.gov/scholarships/'
         OR description ILIKE '%published by EducationUSA (U.S. Department of State).%See the official programme page%'
       )`,
  );
  return rows;
}

async function reEnrichEducationUsaRows(rows, delayMs = 80) {
  let updated = 0;
  let stillSelfLinked = 0;

  for (const row of rows) {
    const sourceUrl = row.source_url || row.application_url;
    if (!sourceUrl || !sourceUrl.includes("/scholarships/")) continue;

    if (delayMs > 0) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(delayMs);
    }

    // eslint-disable-next-line no-await-in-loop
    const { html, status, error } = await fetchHtml(sourceUrl);
    if (error || status >= 400 || !html) {
      stillSelfLinked += 1;
      continue;
    }

    const detail = parseDetailPage(html, sourceUrl);
    const importShape = toImportRecord({
      ...detail,
      path: new URL(sourceUrl).pathname,
      title: detail.title || row.title,
      organizationName: detail.organizationName || row.organization_name,
    });

    const nextApplicationUrl = importShape.applicationUrl;
    const nextDescription = importShape.description;
    const selfLinked =
      nextApplicationUrl &&
      /^https:\/\/educationusa\.state\.gov\/scholarships\//i.test(nextApplicationUrl);

    if (selfLinked && (!detail.description || detail.description.length < 80)) {
      stillSelfLinked += 1;
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    await query(
      `UPDATE scholarships
       SET title = COALESCE(NULLIF($2, ''), title),
           organization_name = COALESCE(NULLIF($3, ''), organization_name),
           degree_level = COALESCE($4, degree_level),
           field_of_study = COALESCE($5, field_of_study),
           description = $6,
           application_url = $7,
           deadline = COALESCE($8, deadline),
           application_start_date = COALESCE($9, application_start_date),
           application_end_date = COALESCE($10, application_end_date),
           is_rolling = COALESCE($11, is_rolling),
           updated_at = NOW()
       WHERE id = $1`,
      [
        row.id,
        importShape.title,
        importShape.organizationName,
        importShape.degreeLevel,
        importShape.fieldOfStudy,
        nextDescription,
        nextApplicationUrl,
        importShape.deadline,
        importShape.applicationStartDate,
        importShape.applicationEndDate,
        importShape.isRolling,
      ],
    );
    updated += 1;
  }

  return { updated, stillSelfLinked };
}

async function rejectTemplateSelfLinkedEducationUsa() {
  const { rows } = await query(
    `SELECT id, title
     FROM scholarships
     WHERE status = 'verified'
       AND source_name = 'EDUCATIONUSA_FINANCIAL_AID'
       AND application_url ~ '^https://educationusa\\.state\\.gov/scholarships/'
       AND description ILIKE '%published by EducationUSA (U.S. Department of State).%See the official programme page%'`,
  );
  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    await query(
      `UPDATE scholarships
       SET status = 'rejected',
           rejection_reason = 'educationusa_detail_unavailable_no_external_apply_url',
           updated_at = NOW()
       WHERE id = $1`,
      [row.id],
    );
  }
  return rows;
}

async function main() {
  const skipFetch = hasFlag("skip-fetch");

  const rejected = await rejectHubJunk();
  let enrichStats = { updated: 0, stillSelfLinked: 0 };

  if (!skipFetch) {
    const rows = await loadEducationUsaRepairRows();
    enrichStats = await reEnrichEducationUsaRows(rows);
  }

  const rejectedTemplates = await rejectTemplateSelfLinkedEducationUsa();

  const csv = await exportVisibleCsv();

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        rejectedHubRows: rejected.length,
        rejectedSample: rejected.slice(0, 8),
        educationUsaEnriched: enrichStats.updated,
        educationUsaStillSelfLinked: enrichStats.stillSelfLinked,
        rejectedTemplateEducationUsa: rejectedTemplates.length,
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
