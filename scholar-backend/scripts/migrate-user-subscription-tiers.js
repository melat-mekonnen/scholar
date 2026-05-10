const { query } = require("../src/infra/db/neonClient");

async function run() {
  console.log("Applying user subscription tier migration...");

  await query(
    `ALTER TABLE users
      ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'premium')),
      ADD COLUMN IF NOT EXISTS ai_requests_today INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS ai_requests_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'paused', 'cancelled'));`
  );

  await query(
    `UPDATE users
      SET plan_type = COALESCE(plan_type, 'free'),
          ai_requests_today = COALESCE(ai_requests_today, 0),
          ai_requests_reset_at = COALESCE(ai_requests_reset_at, NOW()),
          subscription_status = COALESCE(subscription_status, 'active')
      WHERE plan_type IS NULL OR ai_requests_today IS NULL OR ai_requests_reset_at IS NULL OR subscription_status IS NULL;`
  );

  console.log("User subscription tier migration complete.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
