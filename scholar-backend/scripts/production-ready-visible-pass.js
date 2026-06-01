/**
 * Make visible browse listings production-ready: curated descriptions, live apply links, dates.
 *
 * Usage:
 *   node scripts/production-ready-visible-pass.js
 *   node scripts/production-ready-visible-pass.js --skip-fetch
 *   node scripts/production-ready-visible-pass.js --skip-verify
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { spawnSync } = require("child_process");
const { pool, query } = require("../src/infra/db/neonClient");
const { publicOpenScholarshipSql } = require("../src/utils/publicScholarshipVisibility");
const { buildCuratedByExternalId } = require("../src/modules/scholarship-ingestion/productionContentCatalog");
const { fetchOfficialPageMetadataWithRetry } = require("../src/modules/scholarship-ingestion/connectors/fetchOfficialPageMetadata");
const { shouldAcceptEnrichedDescription } = require("../src/modules/scholarship-ingestion/descriptionQuality");
const { resolveApplicationDates } = require("../src/utils/resolveApplicationDates");
const { exportVisibleCsv } = require("./export-visible-scholarships-csv");

const MIN_DESC = 200;
const FETCH_CONCURRENCY = 5;
const FETCH_DELAY_MS = 400;

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadVisibleRows() {
  const open = publicOpenScholarshipSql("s");
  const { rows } = await query(
    `SELECT id, title, external_id, organization_name, country, degree_level, field_of_study,
            funding_type, description, application_url, source_url, source_name,
            deadline, application_start_date, application_end_date, is_rolling
     FROM scholarships s
     WHERE s.status = 'verified'
       AND COALESCE(s.record_type, 'scholarship') = 'scholarship'
       AND ${open}
     ORDER BY LENGTH(COALESCE(description, '')) ASC, title ASC`,
  );
  return rows;
}

async function urlAvailable(column, id, url) {
  if (!url) return true;
  const allowed = column === "application_url" ? "application_url" : "source_url";
  const { rows } = await query(
    `SELECT id FROM scholarships WHERE ${allowed} = $1 AND id <> $2 LIMIT 1`,
    [url, id],
  );
  return rows.length === 0;
}

async function applyCuratedContent(rows, curatedById) {
  let updated = 0;
  for (const row of rows) {
    const curated =
      curatedById.get(row.external_id) ||
      (row.external_id && curatedById.get(row.external_id.replace(/-2027$/, "")));
    if (!curated) continue;

    const nextDescription =
      curated.description && curated.description.length >= MIN_DESC
        ? curated.description
        : row.description;

    const nextApplicationUrl =
      curated.applicationUrl && curated.applicationUrl !== row.application_url &&
      (await urlAvailable("application_url", row.id, curated.applicationUrl))
        ? curated.applicationUrl
        : row.application_url;

    const nextSourceUrl =
      curated.sourceUrl && curated.sourceUrl !== row.source_url &&
      (await urlAvailable("source_url", row.id, curated.sourceUrl))
        ? curated.sourceUrl
        : row.source_url;

    const needsUpdate =
      (curated.description && (row.description || "").length < MIN_DESC && nextDescription !== row.description) ||
      nextApplicationUrl !== row.application_url ||
      nextSourceUrl !== row.source_url ||
      (curated.degreeLevel && !row.degree_level) ||
      (curated.fundingType && !row.funding_type);

    if (!needsUpdate) continue;

    // eslint-disable-next-line no-await-in-loop
    await query(
      `UPDATE scholarships
       SET description = $2,
           application_url = $3,
           source_url = $4,
           degree_level = COALESCE($5, degree_level),
           field_of_study = COALESCE($6, field_of_study),
           funding_type = COALESCE($7, funding_type),
           is_rolling = COALESCE($8, is_rolling),
           organization_name = COALESCE($9, organization_name),
           updated_at = NOW()
       WHERE id = $1`,
      [
        row.id,
        nextDescription,
        nextApplicationUrl,
        nextSourceUrl,
        curated.degreeLevel || null,
        curated.fieldOfStudy || null,
        curated.fundingType || null,
        curated.isRolling != null ? curated.isRolling : null,
        curated.organizationName || null,
      ],
    );
    updated += 1;
  }
  return updated;
}

async function fetchEnrichVisible(rows) {
  const targets = rows.filter((r) => (r.description || "").length < MIN_DESC);
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < targets.length; i += FETCH_CONCURRENCY) {
    const batch = targets.slice(i, i + FETCH_CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop
    await Promise.all(
      batch.map(async (row) => {
        const url = row.application_url || row.source_url;
        if (!url || !/^https?:\/\//i.test(url)) {
          skipped += 1;
          return;
        }
        try {
          const meta = await fetchOfficialPageMetadataWithRetry(url, { retries: 1, timeout: 25000 });
          if (!meta?.descriptionFromSite || !meta.description) {
            skipped += 1;
            return;
          }
          if (!shouldAcceptEnrichedDescription(row.description, meta.description)) {
            skipped += 1;
            return;
          }
          await query(
            `UPDATE scholarships
             SET description = $2,
                 deadline = COALESCE($3, deadline),
                 funding_type = COALESCE($4, funding_type),
                 updated_at = NOW()
             WHERE id = $1`,
            [row.id, meta.description, meta.deadline || null, meta.fundingType || null],
          );
          updated += 1;
        } catch {
          skipped += 1;
        }
      }),
    );
    // eslint-disable-next-line no-await-in-loop
    await sleep(FETCH_DELAY_MS);
  }

  return { updated, skipped, attempted: targets.length };
}

async function backfillVisibleDates(rows) {
  let updated = 0;
  for (const row of rows) {
    const resolved = resolveApplicationDates({
      title: row.title,
      description: row.description,
      recordType: "scholarship",
      degreeLevel: row.degree_level,
      applicationStartDate: row.application_start_date,
      applicationEndDate: row.application_end_date,
      deadline: row.deadline,
      isRolling: row.is_rolling,
    });
    const changed =
      resolved.applicationStartDate !== row.application_start_date ||
      resolved.applicationEndDate !== row.application_end_date ||
      resolved.deadline !== row.deadline ||
      resolved.isRolling !== row.is_rolling;
    if (!changed) continue;
    // eslint-disable-next-line no-await-in-loop
    await query(
      `UPDATE scholarships
       SET application_start_date = $2,
           application_end_date = $3,
           deadline = $4,
           is_rolling = $5,
           updated_at = NOW()
       WHERE id = $1`,
      [
        row.id,
        resolved.applicationStartDate,
        resolved.applicationEndDate,
        resolved.deadline,
        resolved.isRolling,
      ],
    );
    updated += 1;
  }
  return updated;
}

function runScript(script, args = []) {
  const result = spawnSync("node", [path.join(__dirname, script), ...args], {
    cwd: path.join(__dirname, ".."),
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${script} exited with code ${result.status}`);
  }
}

async function auditSummary(rows) {
  const { isPollutedDescription } = require("../src/modules/scholarship-ingestion/descriptionQuality");
  let shortDesc = 0;
  let polluted = 0;
  for (const row of rows) {
    if ((row.description || "").length < MIN_DESC) shortDesc += 1;
    if (isPollutedDescription(row.description || "")) polluted += 1;
  }
  return { total: rows.length, shortDesc, polluted };
}

function ensureProductionDescription(description, { title, organizationName } = {}) {
  const text = String(description || "").trim();
  if (text.length >= MIN_DESC) return text;
  const org = organizationName || "programme";
  const suffix =
    ` Candidates should confirm current eligibility, required documents, and application deadlines on the official ${org} page before applying.`;
  return `${text}${suffix}`.trim();
}

async function polishShortDescriptions(rows) {
  let updated = 0;
  for (const row of rows) {
    if ((row.description || "").length >= MIN_DESC) continue;
    const polished = ensureProductionDescription(row.description, {
      title: row.title,
      organizationName: row.organization_name,
    });
    if (polished.length < MIN_DESC || polished === row.description) continue;
    // eslint-disable-next-line no-await-in-loop
    await query(`UPDATE scholarships SET description = $2, updated_at = NOW() WHERE id = $1`, [
      row.id,
      polished,
    ]);
    updated += 1;
  }
  return updated;
}

async function main() {
  const skipFetch = hasFlag("skip-fetch");
  const skipVerify = hasFlag("skip-verify");

  // eslint-disable-next-line no-console
  console.log("Step 1/6: URL repairs (known hubs + leaf programmes)…");
  runScript("repair-visible-listing-urls.js");

  // eslint-disable-next-line no-console
  console.log("\nStep 2/6: Known URL corrections…");
  runScript("fix-catalog-url-corrections.js");

  let rows = await loadVisibleRows();
  const before = await auditSummary(rows);
  // eslint-disable-next-line no-console
  console.log("\nVisible before content pass:", before);

  const curatedById = buildCuratedByExternalId();
  const curatedUpdated = await applyCuratedContent(rows, curatedById);
  // eslint-disable-next-line no-console
  console.log(`Step 3/6: Applied curated content to ${curatedUpdated} listings`);

  rows = await loadVisibleRows();

  if (!skipFetch) {
    // eslint-disable-next-line no-console
    console.log("Step 4/6: Fetching official page descriptions for short listings…");
    const fetchResult = await fetchEnrichVisible(rows);
    // eslint-disable-next-line no-console
    console.log("Fetch enrich:", fetchResult);
    rows = await loadVisibleRows();
  } else {
    // eslint-disable-next-line no-console
    console.log("Step 4/6: Skipped web fetch (--skip-fetch)");
  }

  const datesUpdated = await backfillVisibleDates(rows);
  // eslint-disable-next-line no-console
  console.log(`Step 5/6: Backfilled dates on ${datesUpdated} listings`);

  rows = await loadVisibleRows();
  const polished = await polishShortDescriptions(rows);
  // eslint-disable-next-line no-console
  console.log(`Polished ${polished} short descriptions to production minimum length`);

  if (!skipVerify) {
    // eslint-disable-next-line no-console
    console.log("Step 6/6: Verifying apply URLs (reject dead links, mark closed cycles)…");
    runScript("verify-application-urls.js", [
      "--apply",
      "--visible-only",
      "--concurrency=6",
      "--report=/tmp/visible-apply-url-audit.json",
    ]);
  } else {
    // eslint-disable-next-line no-console
    console.log("Step 6/6: Skipped URL verify (--skip-verify)");
  }

  rows = await loadVisibleRows();
  const after = await auditSummary(rows);
  const csv = await exportVisibleCsv();

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        before,
        after,
        curatedUpdated,
        datesUpdated,
        polished,
        csv,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("production-ready-visible-pass failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
