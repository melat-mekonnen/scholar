const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(
    `ALTER TABLE scholarships
     ADD COLUMN IF NOT EXISTS is_rolling BOOLEAN NOT NULL DEFAULT FALSE,
     ADD COLUMN IF NOT EXISTS eligible_regions TEXT[] DEFAULT '{}',
     ADD COLUMN IF NOT EXISTS ingestion_tier TEXT,
     ADD COLUMN IF NOT EXISTS normalized_source_url TEXT`,
    [],
  );

  await query(
    `CREATE INDEX IF NOT EXISTS idx_scholarships_normalized_source_url
     ON scholarships (normalized_source_url)
     WHERE normalized_source_url IS NOT NULL AND normalized_source_url <> ''`,
    [],
  );

  await query(
    `CREATE INDEX IF NOT EXISTS idx_scholarships_ingestion_tier
     ON scholarships (ingestion_tier)
     WHERE ingestion_tier IS NOT NULL`,
    [],
  );

  // eslint-disable-next-line no-console
  console.log("scholarship ingestion quality columns migration completed");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("ingestion quality migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
