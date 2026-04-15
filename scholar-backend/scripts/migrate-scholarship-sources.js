const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(
    `ALTER TABLE scholarships
     ADD COLUMN IF NOT EXISTS source_name TEXT,
     ADD COLUMN IF NOT EXISTS source_url TEXT,
     ADD COLUMN IF NOT EXISTS external_id TEXT,
     ADD COLUMN IF NOT EXISTS ai_confidence DOUBLE PRECISION,
     ADD COLUMN IF NOT EXISTS discovered_at TIMESTAMPTZ`,
    [],
  );

  await query(
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_scholarships_source_url
     ON scholarships (source_url)
     WHERE source_url IS NOT NULL AND source_url <> ''`,
    [],
  );

  await query(
    `CREATE INDEX IF NOT EXISTS idx_scholarships_discovered_at
     ON scholarships (discovered_at DESC)`,
    [],
  );

  // eslint-disable-next-line no-console
  console.log("scholarship source columns migration completed");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("scholarship sources migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

