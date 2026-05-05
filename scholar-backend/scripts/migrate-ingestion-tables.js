const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(
    `CREATE TABLE IF NOT EXISTS scholarship_import_runs (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       source_name TEXT NOT NULL,
       status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
       started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       finished_at TIMESTAMPTZ,
       records_fetched INTEGER NOT NULL DEFAULT 0,
       records_upserted INTEGER NOT NULL DEFAULT 0,
       records_failed INTEGER NOT NULL DEFAULT 0,
       error_message TEXT
     )`,
    [],
  );

  await query(
    `CREATE TABLE IF NOT EXISTS scholarship_raw_imports (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       run_id UUID NOT NULL REFERENCES scholarship_import_runs(id) ON DELETE CASCADE,
       source_name TEXT NOT NULL,
       source_url TEXT,
       external_id TEXT,
       payload JSONB NOT NULL,
       normalized_payload JSONB,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    [],
  );

  await query(
    `CREATE TABLE IF NOT EXISTS scholarship_import_errors (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       run_id UUID NOT NULL REFERENCES scholarship_import_runs(id) ON DELETE CASCADE,
       source_name TEXT NOT NULL,
       source_url TEXT,
       external_id TEXT,
       error_type TEXT NOT NULL,
       error_message TEXT NOT NULL,
       payload JSONB,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    [],
  );

  await query(
    `CREATE INDEX IF NOT EXISTS idx_import_runs_source_started
     ON scholarship_import_runs(source_name, started_at DESC)`,
    [],
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_import_raw_run
     ON scholarship_raw_imports(run_id, created_at DESC)`,
    [],
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_import_errors_run
     ON scholarship_import_errors(run_id, created_at DESC)`,
    [],
  );

  // eslint-disable-next-line no-console
  console.log("Ingestion tables migration complete.");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Ingestion migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
