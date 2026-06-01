/**
 * Backfill title_am / description_am for scholarships missing Amharic content.
 *
 * Usage:
 *   node scripts/scholarships/translate-amharic.js [--all] [--force] [--batch=25] [--concurrency=3]
 *
 * Loops in batches until every verified scholarship has Amharic (or no candidates remain).
 */
require("dotenv").config();

const { pool } = require("../../src/infra/db/neonClient");
const { ScholarshipRepository } = require("../../src/repositories/ScholarshipRepository");
const { StudyProgrammeRepository } = require("../../src/repositories/StudyProgrammeRepository");
const {
  ensureScholarshipAmharicContent,
  ensureStudyProgrammeAmharicContent,
  isTranslationEnabled,
} = require("../../src/services/scholarshipAmharicContent");

function parseArgs() {
  const force = process.argv.includes("--force");
  const batchArg = process.argv.find((a) => a.startsWith("--batch="));
  const concurrencyArg = process.argv.find((a) => a.startsWith("--concurrency="));
  const batchSize = batchArg ? parseInt(batchArg.split("=")[1], 10) : 25;
  const concurrency = concurrencyArg ? parseInt(concurrencyArg.split("=")[1], 10) : 3;
  return { force, batchSize: Math.max(1, batchSize), concurrency: Math.max(1, concurrency) };
}

async function processBatch(rows, force, ensureFn) {
  let translated = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    const result = await ensureFn(row.id, { force });
    if (result.translated) {
      translated += 1;
      // eslint-disable-next-line no-console
      console.log(`Translated: ${row.title.slice(0, 70)}… [${result.source}]`);
    } else if (result.skipped) {
      skipped += 1;
    } else {
      failed += 1;
    }
  }

  return { translated, skipped, failed };
}

async function processBatchConcurrent(rows, force, concurrency, ensureFn) {
  let translated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += concurrency) {
    const slice = rows.slice(i, i + concurrency);
    // eslint-disable-next-line no-await-in-loop
    const results = await Promise.all(slice.map((row) => ensureFn(row.id, { force })));

    results.forEach((result, index) => {
      const row = slice[index];
      if (result.translated) {
        translated += 1;
        // eslint-disable-next-line no-console
        console.log(`Translated: ${row.title.slice(0, 70)}… [${result.source}]`);
      } else if (result.skipped) {
        skipped += 1;
      } else {
        failed += 1;
      }
    });
  }

  return { translated, skipped, failed };
}

async function backfillTable({
  label,
  batchSize,
  concurrency,
  force,
  fetchBatch,
  ensureFn,
}) {
  let totalTranslated = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let batchNum = 0;

  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const rows = await fetchBatch(batchSize, !force);
    if (!rows.length) break;

    batchNum += 1;
    // eslint-disable-next-line no-console
    console.log(`${label} batch ${batchNum}: ${rows.length} row(s)…`);

    // eslint-disable-next-line no-await-in-loop
    const stats =
      concurrency > 1
        ? await processBatchConcurrent(rows, force, concurrency, ensureFn)
        : await processBatch(rows, force, ensureFn);

    totalTranslated += stats.translated;
    totalSkipped += stats.skipped;
    totalFailed += stats.failed;

    if (force) break;
  }

  return { batchNum, totalTranslated, totalSkipped, totalFailed };
}

async function main() {
  if (!isTranslationEnabled()) {
    // eslint-disable-next-line no-console
    console.error(
      "Translation is disabled. Set AI_TRANSLATION_GOOGLE_FALLBACK=true (default) or AI_TRANSLATION_ENABLED=true.",
    );
    process.exit(1);
  }

  const { force, batchSize, concurrency } = parseArgs();
  const scholarshipRepo = new ScholarshipRepository();
  const programmeRepo = new StudyProgrammeRepository();

  const scholarshipStats = await backfillTable({
    label: "Scholarships",
    batchSize,
    concurrency,
    force,
    fetchBatch: (limit, onlyMissingAm) =>
      scholarshipRepo.listForContentEnrichment({ limit, all: false, onlyMissingAm }),
    ensureFn: ensureScholarshipAmharicContent,
  });

  const programmeStats = await backfillTable({
    label: "Study programmes",
    batchSize,
    concurrency,
    force,
    fetchBatch: (limit, onlyMissingAm) =>
      programmeRepo.listForAmharicTranslation({ limit, onlyMissingAm }),
    ensureFn: ensureStudyProgrammeAmharicContent,
  });

  const counts = await pool.query(
    `SELECT
       COUNT(*) FILTER (
         WHERE title_am IS NOT NULL AND description_am IS NOT NULL
           AND (organization_name IS NULL OR organization_name = '' OR organization_name_am IS NOT NULL)
           AND (country IS NULL OR country = '' OR country_am IS NOT NULL)
       )::int AS scholarships_with_am,
       COUNT(*)::int AS scholarships_total
     FROM scholarships
     WHERE status = 'verified'`,
  );

  const programmeCounts = await pool.query(
    `SELECT
       COUNT(*) FILTER (
         WHERE title_am IS NOT NULL AND description_am IS NOT NULL
           AND (organization_name IS NULL OR organization_name = '' OR organization_name_am IS NOT NULL)
           AND (country IS NULL OR country = '' OR country_am IS NOT NULL)
       )::int AS programmes_with_am,
       COUNT(*)::int AS programmes_total
     FROM study_programmes
     WHERE status = 'verified'`,
  );

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        scholarships: {
          batches: scholarshipStats.batchNum,
          translated: scholarshipStats.totalTranslated,
          skipped: scholarshipStats.totalSkipped,
          failed: scholarshipStats.totalFailed,
          verifiedWithAmharic: counts.rows[0]?.scholarships_with_am,
          verifiedTotal: counts.rows[0]?.scholarships_total,
        },
        studyProgrammes: {
          batches: programmeStats.batchNum,
          translated: programmeStats.totalTranslated,
          skipped: programmeStats.totalSkipped,
          failed: programmeStats.totalFailed,
          verifiedWithAmharic: programmeCounts.rows[0]?.programmes_with_am,
          verifiedTotal: programmeCounts.rows[0]?.programmes_total,
        },
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
