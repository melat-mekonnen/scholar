/**
 * Add Amharic metadata columns to study_programmes.
 */
const { query, pool } = require("../../../src/infra/db/neonClient");

async function main() {
  await query(
    `ALTER TABLE study_programmes
     ADD COLUMN IF NOT EXISTS organization_name_am TEXT,
     ADD COLUMN IF NOT EXISTS country_am TEXT,
     ADD COLUMN IF NOT EXISTS host_country_am TEXT,
     ADD COLUMN IF NOT EXISTS field_of_study_am TEXT`,
    [],
  );

  // eslint-disable-next-line no-console
  console.log("study_programmes Amharic metadata columns migration complete");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("study_programmes Amharic migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
