ALTER TABLE scholarships
  ADD COLUMN IF NOT EXISTS duplicate_metadata JSONB;
