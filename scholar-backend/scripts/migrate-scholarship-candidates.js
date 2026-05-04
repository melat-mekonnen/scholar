const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`, []);

  await query(
    `CREATE TABLE IF NOT EXISTS scholarship_candidates (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       title TEXT NOT NULL,
       url TEXT NOT NULL UNIQUE,
       university TEXT,
       deadline DATE,
       description TEXT,
       extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
       score INTEGER NOT NULL DEFAULT 0,
       status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    [],
  );

  await query(
    `CREATE TABLE IF NOT EXISTS scholarship_candidate_raw_items (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       feed_name TEXT,
       item_title TEXT,
       item_url TEXT NOT NULL UNIQUE,
       published_at DATE,
       collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       processed_at TIMESTAMPTZ,
       process_error TEXT
     )`,
    [],
  );

  await query(
    `CREATE INDEX IF NOT EXISTS idx_scholarship_candidates_status_created
     ON scholarship_candidates (status, created_at DESC)`,
    [],
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_candidate_raw_processed_collected
     ON scholarship_candidate_raw_items (processed_at, collected_at)`,
    [],
  );

  // eslint-disable-next-line no-console
  console.log("scholarship candidate tables migration completed");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("scholarship candidate migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

