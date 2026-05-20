/**
 * Adds quality_score, host_country, and duplicate status for scholarship intelligence layer.
 */
const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(
    `ALTER TABLE scholarships
     ADD COLUMN IF NOT EXISTS quality_score INTEGER,
     ADD COLUMN IF NOT EXISTS host_country TEXT`,
    [],
  );

  await query(
    `ALTER TABLE scholarships DROP CONSTRAINT IF EXISTS scholarships_status_check`,
    [],
  );
  await query(
    `ALTER TABLE scholarships ADD CONSTRAINT scholarships_status_check
     CHECK (status IN ('draft', 'pending', 'verified', 'rejected', 'expired', 'duplicate', 'needs_review'))`,
    [],
  );

  await query(
    `CREATE INDEX IF NOT EXISTS idx_scholarships_quality_score
     ON scholarships (quality_score DESC NULLS LAST)
     WHERE status = 'verified'`,
    [],
  );

  await query(
    `UPDATE scholarships SET host_country = country WHERE host_country IS NULL AND country IS NOT NULL`,
    [],
  );

  // eslint-disable-next-line no-console
  console.log("Scholarship intelligence migration complete.");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
