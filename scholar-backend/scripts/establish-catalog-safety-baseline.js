/**
 * Catalog safety baseline:
 * - records current verified counts
 * - creates a one-time snapshot table for verified scholarship rows
 *
 * Usage:
 *   node scripts/establish-catalog-safety-baseline.js
 *   node scripts/establish-catalog-safety-baseline.js --label=catalog_safety_start --snapshot=scholarships_verified_snapshot_baseline
 */
require("dotenv").config();

const { pool } = require("../src/infra/db/neonClient");
const { BASELINE_TABLE } = require("../src/modules/scholarship-ingestion/verifiedFloorGuard");

function parseArg(name, fallback) {
  const arg = process.argv.find((part) => part.startsWith(`--${name}=`));
  if (!arg) return fallback;
  return arg.slice(name.length + 3);
}

function toSafeIdentifier(value, fallback) {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return fallback;
  const safe = normalized.replace(/[^a-z0-9_]/g, "_");
  if (!/^[a-z_][a-z0-9_]*$/.test(safe)) return fallback;
  return safe;
}

async function tableExists(name) {
  const result = await pool.query("SELECT to_regclass($1) AS regclass", [name]);
  return Boolean(result.rows?.[0]?.regclass);
}

async function main() {
  const label = parseArg("label", "catalog_safety_start");
  const snapshotTable = toSafeIdentifier(
    parseArg("snapshot", "scholarships_verified_snapshot_baseline"),
    "scholarships_verified_snapshot_baseline",
  );

  await pool.query(
    `CREATE TABLE IF NOT EXISTS ${BASELINE_TABLE} (
      id BIGSERIAL PRIMARY KEY,
      label TEXT NOT NULL,
      verified_count INTEGER NOT NULL,
      total_verified_count INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
  );

  const counts = await pool.query(
    `SELECT
        (SELECT COUNT(*)::int
           FROM scholarships
          WHERE status = 'verified'
            AND COALESCE(record_type, 'scholarship') = 'scholarship') AS verified_scholarships,
        (SELECT COUNT(*)::int
           FROM scholarships
          WHERE status = 'verified') AS total_verified`,
  );
  const row = counts.rows[0] || { verified_scholarships: 0, total_verified: 0 };

  await pool.query(
    `INSERT INTO ${BASELINE_TABLE} (label, verified_count, total_verified_count)
          VALUES ($1, $2, $3)`,
    [label, row.verified_scholarships, row.total_verified],
  );

  const snapshotExists = await tableExists(snapshotTable);
  if (!snapshotExists) {
    await pool.query(
      `CREATE TABLE ${snapshotTable} AS
         SELECT *
           FROM scholarships
          WHERE status = 'verified'
            AND COALESCE(record_type, 'scholarship') = 'scholarship'`,
    );
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        label,
        baselineTable: BASELINE_TABLE,
        snapshotTable,
        snapshotCreated: !snapshotExists,
        verifiedScholarships: row.verified_scholarships,
        totalVerified: row.total_verified,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("catalog safety baseline failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
