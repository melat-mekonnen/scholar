/**
 * Student notification prefs, deadline reminder log, application confirm tokens.
 * Run: node scripts/migrate-student-notifications.js
 */
require("dotenv").config();
const { Pool } = require("pg");

const sql = `
CREATE TABLE IF NOT EXISTS student_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  deadline_reminders BOOLEAN NOT NULL DEFAULT TRUE,
  apply_followups BOOLEAN NOT NULL DEFAULT TRUE,
  email_updates BOOLEAN NOT NULL DEFAULT TRUE,
  match_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scholarship_reminder_sent (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  scholarship_id UUID NOT NULL REFERENCES scholarships (id) ON DELETE CASCADE,
  days_before INTEGER NOT NULL CHECK (days_before IN (7, 3, 1)),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, scholarship_id, days_before)
);

CREATE INDEX IF NOT EXISTS idx_scholarship_reminder_sent_user
  ON scholarship_reminder_sent (user_id);

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS follow_up_sent_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS application_confirm_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_application_confirm_tokens_application
  ON application_confirm_tokens (application_id);
`;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query(sql);
    console.log("OK: student notification tables and application columns are ready");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
