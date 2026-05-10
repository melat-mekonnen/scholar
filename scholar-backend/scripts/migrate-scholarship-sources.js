const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(
    `CREATE TABLE IF NOT EXISTS scholarship_sources (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       name TEXT NOT NULL,
       url TEXT NOT NULL UNIQUE,
       source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'sitemap', 'page', 'api')),
       status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
       trust_score DOUBLE PRECISION NOT NULL DEFAULT 0.5,
       is_active BOOLEAN NOT NULL DEFAULT TRUE,
       last_crawled_at TIMESTAMPTZ,
       created_by UUID REFERENCES users (id),
       metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    [],
  );

  await query(
    `ALTER TABLE scholarships
     ADD COLUMN IF NOT EXISTS source_id UUID,
     ADD COLUMN IF NOT EXISTS source_name TEXT,
     ADD COLUMN IF NOT EXISTS source_url TEXT,
     ADD COLUMN IF NOT EXISTS external_id TEXT,
     ADD COLUMN IF NOT EXISTS ai_confidence DOUBLE PRECISION,
     ADD COLUMN IF NOT EXISTS extraction_confidence DOUBLE PRECISION,
     ADD COLUMN IF NOT EXISTS normalized_tags TEXT[] DEFAULT '{}'::text[],
     ADD COLUMN IF NOT EXISTS funding_classification TEXT,
     ADD COLUMN IF NOT EXISTS eligibility_hints TEXT,
     ADD COLUMN IF NOT EXISTS eligible_countries TEXT[] DEFAULT '{}'::text[],
     ADD COLUMN IF NOT EXISTS eligible_fields TEXT[] DEFAULT '{}'::text[],
     ADD COLUMN IF NOT EXISTS gpa_requirements TEXT,
     ADD COLUMN IF NOT EXISTS english_requirements TEXT,
     ADD COLUMN IF NOT EXISTS extraction_metadata JSONB,
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

