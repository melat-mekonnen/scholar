const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(
    `ALTER TABLE scholarship_import_runs
     ADD COLUMN IF NOT EXISTS records_skipped INTEGER NOT NULL DEFAULT 0`,
    [],
  );

  // eslint-disable-next-line no-console
  console.log("Ingestion source health migration complete (records_skipped).");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Ingestion source health migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
