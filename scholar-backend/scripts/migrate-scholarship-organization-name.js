const { query, pool } = require("../src/infra/db/neonClient");

async function run() {
  await query(
    `ALTER TABLE scholarships
     ADD COLUMN IF NOT EXISTS organization_name TEXT`,
    [],
  );
  // eslint-disable-next-line no-console
  console.log("scholarships.organization_name migration complete");
}

run()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("organization_name migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
