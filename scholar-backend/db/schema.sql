-- Scholar backend — single source of truth for PostgreSQL DDL (Express app).
-- Apply after db/00-dev-reset-public.sql for a clean local DB, or use IF NOT EXISTS on existing DBs.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  google_id TEXT UNIQUE,
  auth_provider TEXT NOT NULL DEFAULT 'local',
  role TEXT NOT NULL DEFAULT 'student'
    CHECK (role IN ('student', 'manager', 'owner', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  subscription_plan TEXT NOT NULL DEFAULT 'free'
    CHECK (subscription_plan IN ('free', 'pro')),
  subscription_expires_at TIMESTAMPTZ,
  subscription_provider TEXT,
  subscription_external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- scholarships
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scholarships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  organization_name TEXT,
  country TEXT NOT NULL,
  deadline DATE,
  application_start_date DATE,
  application_end_date DATE,
  degree_level TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'verified', 'rejected', 'expired', 'duplicate', 'needs_review')),
  funding_type TEXT,
  field_of_study TEXT,
  amount TEXT,
  description TEXT,
  application_url TEXT,
  source_name TEXT,
  source_url TEXT,
  external_id TEXT,
  ai_confidence DOUBLE PRECISION,
  discovered_at TIMESTAMPTZ,
  posted_by_user_id UUID REFERENCES users (id),
  rejection_reason TEXT,
  is_recommended_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_rolling BOOLEAN NOT NULL DEFAULT FALSE,
  eligible_regions TEXT[] DEFAULT '{}',
  ingestion_tier TEXT,
  normalized_source_url TEXT,
  quality_score INTEGER,
  host_country TEXT,
  title_am TEXT,
  description_am TEXT,
  extracted_facts JSONB,
  record_type TEXT NOT NULL DEFAULT 'scholarship',
  application_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scholarships_record_type_check') THEN
    ALTER TABLE scholarships
      ADD CONSTRAINT scholarships_record_type_check
      CHECK (record_type IN ('scholarship', 'study_programme'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scholarships_application_status_check') THEN
    ALTER TABLE scholarships
      ADD CONSTRAINT scholarships_application_status_check
      CHECK (
        application_status IS NULL
        OR application_status IN ('open', 'closed', 'rolling', 'unknown')
      );
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS ux_scholarships_source_url
  ON scholarships (source_url)
  WHERE source_url IS NOT NULL AND source_url <> '';

-- ---------------------------------------------------------------------------
-- study_programmes (degree courses — fees apply, not funded scholarships)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS study_programmes (
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
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_study_programmes_source_url
  ON study_programmes (source_url)
  WHERE source_url IS NOT NULL AND source_url <> '';

CREATE TABLE IF NOT EXISTS programme_scholarships (
  programme_id UUID NOT NULL REFERENCES study_programmes (id) ON DELETE CASCADE,
  scholarship_id UUID NOT NULL REFERENCES scholarships (id) ON DELETE CASCADE,
  link_type TEXT NOT NULL DEFAULT 'related',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (programme_id, scholarship_id)
);

-- ---------------------------------------------------------------------------
-- documents (file resources; was previously only in migrate-documents-table.js)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT NOT NULL DEFAULT 0,
  scholarship_id UUID REFERENCES scholarships (id) ON DELETE SET NULL,
  uploaded_by_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  download_count INTEGER NOT NULL DEFAULT 0,
  requires_pro BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_type ON documents (type);
CREATE INDEX IF NOT EXISTS idx_documents_scholarship_id ON documents (scholarship_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents (uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents (created_at DESC);

-- ---------------------------------------------------------------------------
-- user_activity
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- student_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  field_of_study TEXT,
  gpa NUMERIC(3, 2) CHECK (gpa IS NULL OR (gpa >= 0.0 AND gpa <= 4.0)),
  degree_level TEXT CHECK (degree_level IS NULL OR degree_level IN ('high_school', 'bachelor', 'master', 'phd')),
  preferred_country TEXT,
  interests TEXT[] NOT NULL DEFAULT '{}',
  completeness_score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- manager_profiles (posting / public-facing context for scholarship managers & owners)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manager_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  job_title TEXT,
  organization_name TEXT,
  bio TEXT,
  public_contact_email TEXT,
  website_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  scholarship_id UUID NOT NULL REFERENCES scholarships (id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'submitted', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- bookmarks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  scholarship_id UUID NOT NULL REFERENCES scholarships (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, scholarship_id)
);

CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx ON bookmarks (user_id);
CREATE INDEX IF NOT EXISTS bookmarks_scholarship_id_idx ON bookmarks (scholarship_id);

-- ---------------------------------------------------------------------------
-- community
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS community_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  pinned_message_id UUID REFERENCES community_messages (id) ON DELETE SET NULL,
  pinned_at TIMESTAMPTZ,
  pinned_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES community_channels (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  parent_message_id UUID REFERENCES community_messages (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
  hidden_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  hidden_at TIMESTAMPTZ,
  edited_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_messages_body_len CHECK (char_length(body) >= 0 AND char_length(body) <= 8000)
);

CREATE TABLE IF NOT EXISTS community_message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES community_messages (id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'pdf', 'cv')),
  file_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_message_attachments_message
  ON community_message_attachments (message_id);

CREATE INDEX IF NOT EXISTS idx_community_messages_channel_created ON community_messages (channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_messages_parent ON community_messages (parent_message_id);
CREATE INDEX IF NOT EXISTS idx_community_messages_visible
  ON community_messages (channel_id, is_hidden, created_at DESC);

CREATE TABLE IF NOT EXISTS community_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES community_messages (id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  reviewed_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_reports_status_created
  ON community_reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_reports_message
  ON community_reports (message_id);

-- Default channels (idempotent)
INSERT INTO community_channels (slug, name, description, sort_order)
VALUES
  ('welcome', 'Welcome & introductions', 'Say hello and meet other applicants.', 0),
  ('application-steps', 'Application steps & timelines', 'Walk through forms, deadlines, and checklists together.', 1),
  ('experiences', 'Experiences & stories', 'Share wins, setbacks, and what worked for you.', 2),
  ('feedback', 'Feedback & critique', 'Constructive peer review of essays, CVs, and plans.', 3)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- password_reset_tokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens (user_id);

-- ---------------------------------------------------------------------------
-- admin_audit_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
  ON admin_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor
  ON admin_audit_logs (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action
  ON admin_audit_logs (action);

-- ---------------------------------------------------------------------------
-- scholarship import runs/raw/errors (independent ingestion module)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scholarship_import_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  records_fetched INTEGER NOT NULL DEFAULT 0,
  records_upserted INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  records_skipped INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS scholarship_raw_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES scholarship_import_runs(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_url TEXT,
  external_id TEXT,
  payload JSONB NOT NULL,
  normalized_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scholarship_import_errors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES scholarship_import_runs(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_url TEXT,
  external_id TEXT,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_runs_source_started
  ON scholarship_import_runs(source_name, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_raw_run
  ON scholarship_raw_imports(run_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_errors_run
  ON scholarship_import_errors(run_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- scholarship_staging (capture → enrich → publish pipeline)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scholarship_staging (
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
);

CREATE INDEX IF NOT EXISTS idx_staging_pipeline_status
  ON scholarship_staging (pipeline_status, source_name);
CREATE INDEX IF NOT EXISTS idx_staging_scholarship_id
  ON scholarship_staging (scholarship_id);

-- ---------------------------------------------------------------------------
-- subscriptions (AI chat freemium / Pro)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_chat_usage (
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  usage_date DATE NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (user_id, usage_date)
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_usage_usage_date ON ai_chat_usage (usage_date);

CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'chapa', 'telebirr', 'manual')),
  provider_payment_id TEXT NOT NULL,
  amount_cents INTEGER,
  currency TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  plan TEXT NOT NULL DEFAULT 'pro' CHECK (plan IN ('pro')),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_payment_id)
);

CREATE INDEX IF NOT EXISTS idx_subscription_payments_user_id ON subscription_payments (user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_created_at ON subscription_payments (created_at DESC);

CREATE TABLE IF NOT EXISTS subscription_checkout_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('stripe', 'chapa', 'telebirr')),
  provider_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'completed', 'expired', 'failed')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_checkout_sessions_user_id
  ON subscription_checkout_sessions (user_id);
