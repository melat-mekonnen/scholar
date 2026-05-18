/**
 * Subscription + AI chat usage tables (Milestone 1).
 * Run: node scripts/migrate-subscription-tables.js
 */
require("dotenv").config();
const { Pool } = require("pg");

const sql = `
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_provider TEXT,
  ADD COLUMN IF NOT EXISTS subscription_external_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_subscription_plan_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_subscription_plan_check
      CHECK (subscription_plan IN ('free', 'pro'));
  END IF;
END $$;

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
`;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const localDbPattern = /(localhost|127\.0\.0\.1)/i;
  const disableSslPattern = /sslmode=disable/i;
  const useSsl =
    !localDbPattern.test(databaseUrl) && !disableSslPattern.test(databaseUrl);

  const pool = new Pool({
    connectionString: databaseUrl,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  try {
    await pool.query(sql);
    console.log("OK: subscription columns and tables are ready");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
