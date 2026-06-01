/**
 * Backfill application_start_date / application_end_date / deadline from descriptions.
 * Usage: node scripts/backfill-scholarship-application-dates.js [--dry-run] [--limit=500]
 */
require("dotenv").config();

const { pool } = require("../src/infra/db/neonClient");
const { resolveApplicationDates } = require("../src/utils/resolveApplicationDates");

function parseArgs() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 5000;
  return { dryRun, limit };
}

async function main() {
  const { dryRun, limit } = parseArgs();
  const { rows } = await pool.query(
    `SELECT id, title, description, record_type, degree_level,
            application_start_date, application_end_date, deadline, is_rolling, status
     FROM scholarships
     WHERE status IN ('verified', 'needs_review', 'pending')
       AND coalesce(record_type, 'scholarship') IN ('scholarship', 'study_programme')
     ORDER BY updated_at DESC
     LIMIT $1`,
    [limit],
  );

  let updated = 0;
  let gainedBothDates = 0;

  for (const row of rows) {
    const resolved = resolveApplicationDates({
      title: row.title,
      description: row.description,
      recordType: row.record_type || "scholarship",
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

    if (!dryRun) {
      await pool.query(
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
    }

    updated += 1;
    if (resolved.applicationStartDate && (resolved.applicationEndDate || resolved.deadline)) {
      gainedBothDates += 1;
    }
  }

  const stats = await pool.query(
    `SELECT
       count(*)::int AS total,
       count(*) filter (where application_start_date is not null)::int AS with_start,
       count(*) filter (where application_end_date is not null or deadline is not null)::int AS with_end,
       count(*) filter (
         where application_start_date is not null
           and (application_end_date is not null or deadline is not null)
       )::int AS with_both,
       count(*) filter (
         where application_start_date is null
           and application_end_date is null
           and deadline is null
           and coalesce(is_rolling, false) = false
       )::int AS with_none
     FROM scholarships
     WHERE status = 'verified'
       AND coalesce(record_type, 'scholarship') = 'scholarship'`,
  );

  const programmeStats = await pool.query(
    `SELECT
       count(*)::int AS total,
       count(*) filter (where application_start_date is not null)::int AS with_start,
       count(*) filter (where application_end_date is not null or deadline is not null)::int AS with_end,
       count(*) filter (
         where application_start_date is not null
           and (application_end_date is not null or deadline is not null)
       )::int AS with_both
     FROM study_programmes
     WHERE status = 'verified'`,
  );

  let programmesUpdated = 0;
  const { rows: programmeRows } = await pool.query(
    `SELECT id, title, description, degree_level, programme_start_date,
            application_start_date, application_end_date, deadline, is_rolling
     FROM study_programmes
     WHERE status = 'verified'
     LIMIT $1`,
    [limit],
  );
  for (const row of programmeRows) {
    const resolved = resolveApplicationDates({
      title: row.title,
      description: row.description,
      recordType: "study_programme",
      degreeLevel: row.degree_level,
      applicationStartDate: row.application_start_date,
      applicationEndDate: row.application_end_date,
      deadline: row.deadline,
      programmeStartDate: row.programme_start_date,
      isRolling: row.is_rolling,
    });
    const changed =
      resolved.applicationStartDate !== row.application_start_date ||
      resolved.applicationEndDate !== row.application_end_date ||
      resolved.deadline !== row.deadline ||
      resolved.isRolling !== row.is_rolling;
    if (!changed) continue;
    if (!dryRun) {
      await pool.query(
        `UPDATE study_programmes
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
    }
    programmesUpdated += 1;
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        dryRun,
        scanned: rows.length,
        updated,
        gainedBothDates,
        programmesUpdated,
        verifiedDateStats: stats.rows[0],
        verifiedProgrammeDateStats: programmeStats.rows[0],
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
