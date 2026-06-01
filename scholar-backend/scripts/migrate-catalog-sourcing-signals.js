/**
 * Additive catalog schema migration:
 * - deadline and eligibility signal columns on scholarships
 * - dynamic ingestion source registry + candidate tables
 */
const { query, pool } = require("../src/infra/db/neonClient");

async function addScholarshipSignals() {
  await query(
    `ALTER TABLE scholarships
       ADD COLUMN IF NOT EXISTS is_rolling_evidence TEXT,
       ADD COLUMN IF NOT EXISTS deadline_raw_text TEXT,
       ADD COLUMN IF NOT EXISTS deadline_source TEXT,
       ADD COLUMN IF NOT EXISTS deadline_confidence INTEGER,
       ADD COLUMN IF NOT EXISTS deadline_last_checked_at TIMESTAMPTZ,
       ADD COLUMN IF NOT EXISTS eligibility_raw_text TEXT,
       ADD COLUMN IF NOT EXISTS eligible_for_ethiopians BOOLEAN,
       ADD COLUMN IF NOT EXISTS eligibility_confidence INTEGER,
       ADD COLUMN IF NOT EXISTS ethiopian_relevance_score INTEGER`,
  );

  await query(
    `DO $$
     BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scholarships_deadline_confidence_check') THEN
         ALTER TABLE scholarships
           ADD CONSTRAINT scholarships_deadline_confidence_check
           CHECK (deadline_confidence IS NULL OR (deadline_confidence >= 0 AND deadline_confidence <= 100));
       END IF;
     END $$;`,
  );

  await query(
    `DO $$
     BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scholarships_eligibility_confidence_check') THEN
         ALTER TABLE scholarships
           ADD CONSTRAINT scholarships_eligibility_confidence_check
           CHECK (eligibility_confidence IS NULL OR (eligibility_confidence >= 0 AND eligibility_confidence <= 100));
       END IF;
     END $$;`,
  );

  await query(
    `DO $$
     BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scholarships_ethiopian_relevance_score_check') THEN
         ALTER TABLE scholarships
           ADD CONSTRAINT scholarships_ethiopian_relevance_score_check
           CHECK (ethiopian_relevance_score IS NULL OR (ethiopian_relevance_score >= 0 AND ethiopian_relevance_score <= 100));
       END IF;
     END $$;`,
  );

  await query(
    `CREATE INDEX IF NOT EXISTS idx_scholarships_deadline_confidence
       ON scholarships (deadline_confidence DESC NULLS LAST)
       WHERE deadline_confidence IS NOT NULL`,
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_scholarships_eligible_for_ethiopians
       ON scholarships (eligible_for_ethiopians)
       WHERE eligible_for_ethiopians IS NOT NULL`,
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_scholarships_ethiopian_relevance_score
       ON scholarships (ethiopian_relevance_score DESC NULLS LAST)
       WHERE ethiopian_relevance_score IS NOT NULL`,
  );
}

async function addSourceRegistryTables() {
  await query(
    `CREATE TABLE IF NOT EXISTS ingestion_sources (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       source_key TEXT NOT NULL UNIQUE,
       label TEXT NOT NULL,
       base_url TEXT NOT NULL,
       source_type TEXT NOT NULL DEFAULT 'other'
         CHECK (source_type IN ('government', 'university', 'ngo', 'aggregator', 'other')),
       trust_tier TEXT NOT NULL DEFAULT 'tier2_trusted'
         CHECK (trust_tier IN ('tier1_official', 'tier2_trusted', 'tier3_discovery')),
       crawl_strategy TEXT NOT NULL DEFAULT 'listing'
         CHECK (crawl_strategy IN ('listing', 'programme', 'api', 'manual')),
       country_focus TEXT,
       enabled BOOLEAN NOT NULL DEFAULT TRUE,
       requires_manual_review BOOLEAN NOT NULL DEFAULT TRUE,
       include_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
       exclude_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
       max_links INTEGER NOT NULL DEFAULT 25,
       delay_ms INTEGER NOT NULL DEFAULT 400,
       retries INTEGER NOT NULL DEFAULT 2,
       timeout_ms INTEGER NOT NULL DEFAULT 30000,
       metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
       last_run_at TIMESTAMPTZ,
       last_success_at TIMESTAMPTZ,
       created_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
  );

  await query(
    `CREATE INDEX IF NOT EXISTS idx_ingestion_sources_enabled
       ON ingestion_sources (enabled, source_type, trust_tier)`,
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_ingestion_sources_country_focus
       ON ingestion_sources (country_focus)
       WHERE country_focus IS NOT NULL`,
  );

  await query(
    `CREATE TABLE IF NOT EXISTS ingestion_source_candidates (
       id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
       discovered_url TEXT NOT NULL,
       discovered_domain TEXT,
       discovered_from_source TEXT,
       discovery_reason TEXT,
       sample_size INTEGER NOT NULL DEFAULT 0,
       sample_valid_count INTEGER NOT NULL DEFAULT 0,
       sample_deadline_rate NUMERIC(5,2),
       sample_duplicate_rate NUMERIC(5,2),
       quality_score INTEGER,
       status TEXT NOT NULL DEFAULT 'new'
         CHECK (status IN ('new', 'approved', 'rejected', 'ignored')),
       notes TEXT,
       approved_source_id UUID REFERENCES ingestion_sources (id) ON DELETE SET NULL,
       reviewed_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
       reviewed_at TIMESTAMPTZ,
       created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
       updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
     )`,
  );

  await query(
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_ingestion_source_candidates_url
       ON ingestion_source_candidates (discovered_url)`,
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_ingestion_source_candidates_status
       ON ingestion_source_candidates (status, created_at DESC)`,
  );
  await query(
    `CREATE INDEX IF NOT EXISTS idx_ingestion_source_candidates_domain
       ON ingestion_source_candidates (discovered_domain)
       WHERE discovered_domain IS NOT NULL`,
  );
}

async function main() {
  await addScholarshipSignals();
  await addSourceRegistryTables();
  // eslint-disable-next-line no-console
  console.log("Catalog sourcing/signals migration complete.");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Catalog sourcing/signals migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
