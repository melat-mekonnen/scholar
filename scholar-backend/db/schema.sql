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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- scholarships
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scholarships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  country TEXT NOT NULL,
  deadline DATE,
  degree_level TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'pending', 'verified', 'rejected', 'expired')),
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_scholarships_source_url
  ON scholarships (source_url)
  WHERE source_url IS NOT NULL AND source_url <> '';

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
  field_of_study TEXT NOT NULL,
  gpa NUMERIC(3, 2) NOT NULL CHECK (gpa >= 0.0 AND gpa <= 4.0),
  degree_level TEXT NOT NULL CHECK (degree_level IN ('high_school', 'bachelor', 'master', 'phd')),
  preferred_country TEXT,
  interests TEXT[] NOT NULL DEFAULT '{}',
  completeness_score INTEGER NOT NULL DEFAULT 0,
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES community_channels (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  parent_message_id UUID REFERENCES community_messages (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_messages_body_len CHECK (char_length(body) >= 1 AND char_length(body) <= 8000)
);

CREATE INDEX IF NOT EXISTS idx_community_messages_channel_created ON community_messages (channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_messages_parent ON community_messages (parent_message_id);

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
