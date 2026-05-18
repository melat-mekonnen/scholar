const { query, pool } = require("../src/infra/db/neonClient");

async function run() {
  await query(`
    CREATE TABLE IF NOT EXISTS scholarship_flags (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      scholarship_id UUID NOT NULL REFERENCES scholarships (id) ON DELETE CASCADE,
      flagged_by_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_scholarship_flags_scholarship
      ON scholarship_flags (scholarship_id, created_at DESC);
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_scholarship_flags_actor
      ON scholarship_flags (flagged_by_user_id, created_at DESC);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS scholarship_notifications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      scholarship_id UUID REFERENCES scholarships (id) ON DELETE SET NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_scholarship_notifications_user
      ON scholarship_notifications (user_id, is_read, created_at DESC);
  `);

  console.log("scholarship moderation tables migration complete");
}

run()
  .catch((err) => {
    console.error("scholarship moderation migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
