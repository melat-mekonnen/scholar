/**
 * Add Amharic columns for scholarship metadata (organization, country, field).
 */
const { query, pool } = require("../../../src/infra/db/neonClient");

async function main() {
  await query(
    `ALTER TABLE scholarships
     ADD COLUMN IF NOT EXISTS organization_name_am TEXT,
     ADD COLUMN IF NOT EXISTS country_am TEXT,
     ADD COLUMN IF NOT EXISTS host_country_am TEXT,
     ADD COLUMN IF NOT EXISTS field_of_study_am TEXT`,
    [],
  );

  // eslint-disable-next-line no-console
  console.log("scholarship Amharic metadata columns migration complete");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Amharic metadata migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
