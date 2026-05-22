/**
 * Phases 0–4: i18n columns, extracted facts, record_type, study_programmes table.
 */
const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(
    `ALTER TABLE scholarships
     ADD COLUMN IF NOT EXISTS title_am TEXT,
     ADD COLUMN IF NOT EXISTS description_am TEXT,
     ADD COLUMN IF NOT EXISTS extracted_facts JSONB,
     ADD COLUMN IF NOT EXISTS record_type TEXT NOT NULL DEFAULT 'scholarship',
     ADD COLUMN IF NOT EXISTS application_status TEXT`,
    [],
  );

  await query(
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_constraint WHERE conname = 'scholarships_record_type_check'
       ) THEN
         ALTER TABLE scholarships
           ADD CONSTRAINT scholarships_record_type_check
           CHECK (record_type IN ('scholarship', 'study_programme'));
       END IF;
     END $$`,
    [],
  );

  await query(
    `DO $$
     BEGIN
       IF NOT EXISTS (
         SELECT 1 FROM pg_constraint WHERE conname = 'scholarships_application_status_check'
       ) THEN
         ALTER TABLE scholarships
           ADD CONSTRAINT scholarships_application_status_check
           CHECK (
             application_status IS NULL
             OR application_status IN ('open', 'closed', 'rolling', 'unknown')
           );
       END IF;
     END $$`,
    [],
  );

  await query(
    `CREATE INDEX IF NOT EXISTS idx_scholarships_record_type
     ON scholarships (record_type)
     WHERE record_type IS NOT NULL`,
    [],
  );

  await query(
    `CREATE TABLE IF NOT EXISTS study_programmes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      title_am TEXT,
      organization_name TEXT,
      country TEXT NOT NULL,
      host_country TEXT,
      degree_level TEXT,
      field_of_study TEXT,
      funding_type TEXT NOT NULL DEFAULT 'not_funded',
      programme_start_date DATE,
      application_start_date DATE,
      application_end_date DATE,
      deadline DATE,
      amount TEXT,
      description TEXT,
      description_am TEXT,
      extracted_facts JSONB,
      application_url TEXT,
      source_url TEXT,
      external_id TEXT,
      status TEXT NOT NULL DEFAULT 'verified'
        CHECK (status IN ('draft', 'pending', 'verified', 'rejected', 'expired')),
      is_rolling BOOLEAN NOT NULL DEFAULT FALSE,
      quality_score INTEGER,
      normalized_source_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    [],
  );

  await query(
    `CREATE UNIQUE INDEX IF NOT EXISTS ux_study_programmes_source_url
     ON study_programmes (source_url)
     WHERE source_url IS NOT NULL AND source_url <> ''`,
    [],
  );

  await query(
    `CREATE INDEX IF NOT EXISTS idx_study_programmes_degree_level
     ON study_programmes (degree_level)
     WHERE degree_level IS NOT NULL`,
    [],
  );

  await query(
    `CREATE TABLE IF NOT EXISTS programme_scholarships (
      programme_id UUID NOT NULL REFERENCES study_programmes (id) ON DELETE CASCADE,
      scholarship_id UUID NOT NULL REFERENCES scholarships (id) ON DELETE CASCADE,
      link_type TEXT NOT NULL DEFAULT 'related',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (programme_id, scholarship_id)
    )`,
    [],
  );

  // eslint-disable-next-line no-console
  console.log("scholarship phases migration completed");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("phases migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
