const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(
    `ALTER TABLE scholarships
     ADD COLUMN IF NOT EXISTS application_start_date DATE,
     ADD COLUMN IF NOT EXISTS application_end_date DATE`,
    [],
  );

  // eslint-disable-next-line no-console
  console.log("scholarships application window migration complete");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("scholarships application window migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
