const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`, []);

  await query(
    `CREATE TABLE IF NOT EXISTS scholarship_sources (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    `CREATE TABLE IF NOT EXISTS scholarship_discovery_sources (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       source_name TEXT NOT NULL,
       source_type TEXT NOT NULL CHECK (source_type IN ('rss', 'sitemap')),
       source_url TEXT NOT NULL UNIQUE,
       organization_name TEXT,
       domain TEXT,
       is_active BOOLEAN NOT NULL DEFAULT TRUE,
       last_fetched_at TIMESTAMPTZ,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
    [],
  );

  await query(
    `CREATE TABLE IF NOT EXISTS scholarship_discovery_raw_items (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       source_id UUID NOT NULL REFERENCES scholarship_discovery_sources (id) ON DELETE CASCADE,
       item_title TEXT,
       item_url TEXT NOT NULL UNIQUE,
       published_at DATE,
       payload JSONB NOT NULL DEFAULT '{}'::jsonb,
       collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       processed_at TIMESTAMPTZ,
       process_error TEXT
     )`,
    [],
  );

  await query(
    `CREATE INDEX IF NOT EXISTS idx_discovery_sources_active
     ON scholarship_discovery_sources (is_active, source_type)`,
    [],
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_discovery_raw_unprocessed
     ON scholarship_discovery_raw_items (processed_at, collected_at)`,
    [],
  );

  // eslint-disable-next-line no-console
  console.log("discovery pipeline tables migration completed");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("discovery pipeline tables migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

