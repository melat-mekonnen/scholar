/**
 * Restore verified scholarship rows from scholarships_verified_snapshot_baseline.
 * Use after a bad scale push to return catalog data to the snapshot taken at baseline.
 *
 * Usage:
 *   node scripts/restore-catalog-snapshot.js
 *   node scripts/restore-catalog-snapshot.js --dry-run=true
 */
require("dotenv").config();

const { pool } = require("../src/infra/db/neonClient");

const SNAPSHOT = "scholarships_verified_snapshot_baseline";

function parseBool(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parseArg(name, fallback) {
  const arg = process.argv.find((part) => part.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : fallback;
}

async function tableExists(name) {
  const result = await pool.query("SELECT to_regclass($1) AS regclass", [name]);
  return Boolean(result.rows?.[0]?.regclass);
}

async function main() {
  const dryRun = parseBool(parseArg("dry-run", "false"), false);

  if (!(await tableExists(SNAPSHOT))) {
    throw new Error(`Missing snapshot table: ${SNAPSHOT}. Run establish-catalog-safety-baseline.js first.`);
  }

  const snapCount = await pool.query(`SELECT COUNT(*)::int AS n FROM ${SNAPSHOT}`);
  const before = await pool.query(
    `SELECT status, COUNT(*)::int AS n
     FROM scholarships
     WHERE COALESCE(record_type, 'scholarship') = 'scholarship'
     GROUP BY status
     ORDER BY status`,
  );

  if (dryRun) {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        { dryRun: true, snapshotRows: snapCount.rows[0]?.n, before: before.rows },
        null,
        2,
      ),
    );
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE scholarships s
       SET status = 'rejected', updated_at = NOW()
       WHERE s.status IN ('verified', 'needs_review', 'pending')
         AND COALESCE(s.record_type, 'scholarship') = 'scholarship'
         AND NOT EXISTS (SELECT 1 FROM ${SNAPSHOT} snap WHERE snap.id = s.id)`,
    );

    await client.query(
      `UPDATE scholarships s
       SET status = 'rejected', updated_at = NOW()
       WHERE s.status IN ('verified', 'needs_review', 'pending')
         AND s.source_url IS NOT NULL
         AND s.source_url <> ''
         AND EXISTS (
           SELECT 1 FROM ${SNAPSHOT} snap
           WHERE snap.source_url = s.source_url
             AND snap.id <> s.id
         )`,
    );

    await client.query(
      `UPDATE scholarships s
       SET
         title = snap.title,
         title_am = snap.title_am,
         organization_name = snap.organization_name,
         country = snap.country,
         host_country = snap.host_country,
         degree_level = snap.degree_level,
         field_of_study = snap.field_of_study,
         funding_type = snap.funding_type,
         deadline = snap.deadline,
         application_start_date = snap.application_start_date,
         application_end_date = snap.application_end_date,
         amount = snap.amount,
         description = snap.description,
         description_am = snap.description_am,
         application_url = snap.application_url,
         source_name = snap.source_name,
         source_url = snap.source_url,
         external_id = snap.external_id,
         is_rolling = snap.is_rolling,
         eligible_regions = snap.eligible_regions,
         ingestion_tier = snap.ingestion_tier,
         application_status = snap.application_status,
         quality_score = snap.quality_score,
         status = 'verified',
         updated_at = NOW()
       FROM ${SNAPSHOT} snap
       WHERE s.id = snap.id`,
    );

    await client.query(
      `UPDATE scholarships
       SET status = 'rejected', updated_at = NOW()
       WHERE source_name = 'URL_CATALOG'
         AND status IN ('verified', 'needs_review', 'pending')`,
    );

    await client.query("COMMIT");

    const after = await pool.query(
      `SELECT status, COUNT(*)::int AS n
       FROM scholarships
       WHERE COALESCE(record_type, 'scholarship') = 'scholarship'
       GROUP BY status
       ORDER BY status`,
    );
    const visible = await pool.query(
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
          snapshotRows: snapCount.rows[0]?.n,
          before: before.rows,
          after: after.rows,
          visible: visible.rows[0]?.n || 0,
        },
        null,
        2,
      ),
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
