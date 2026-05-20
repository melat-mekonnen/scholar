const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(
    `CREATE TABLE IF NOT EXISTS scholarship_staging (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       run_id UUID REFERENCES scholarship_import_runs(id) ON DELETE SET NULL,
       canonical_key TEXT NOT NULL,
       source_name TEXT NOT NULL,
       source_url TEXT,
       external_id TEXT,
       pipeline_status TEXT NOT NULL DEFAULT 'captured'
         CHECK (pipeline_status IN ('captured', 'validated', 'ready', 'published', 'quarantined')),
       validation_errors JSONB NOT NULL DEFAULT '[]'::jsonb,
       gate_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
       quality_score INTEGER,
       normalized_payload JSONB NOT NULL,
       raw_payload JSONB NOT NULL,
       scholarship_id UUID REFERENCES scholarships(id) ON DELETE SET NULL,
       published_at TIMESTAMPTZ,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       UNIQUE (canonical_key, source_name)
     )`,
    [],
  );

  await query(
    `CREATE INDEX IF NOT EXISTS idx_staging_pipeline_status
     ON scholarship_staging (pipeline_status, source_name)`,
    [],
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_staging_scholarship_id
     ON scholarship_staging (scholarship_id)`,
    [],
  );

  // eslint-disable-next-line no-console
  console.log("scholarship_staging migration complete.");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Staging migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
