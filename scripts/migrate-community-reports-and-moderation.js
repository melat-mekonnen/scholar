const { query, pool } = require("../src/infra/db/neonClient");

async function run() {
  await query(`
    ALTER TABLE community_channels
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE
  `);

  await query(`
    ALTER TABLE community_messages
    ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE
  `);
  await query(`
    ALTER TABLE community_messages
    ADD COLUMN IF NOT EXISTS hidden_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL
  `);
  await query(`
    ALTER TABLE community_messages
    ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMPTZ
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_community_messages_visible
      ON community_messages (channel_id, is_hidden, created_at DESC)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS community_reports (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      message_id UUID NOT NULL REFERENCES community_messages (id) ON DELETE CASCADE,
      reporter_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
      reviewed_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_community_reports_status_created
      ON community_reports (status, created_at DESC)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_community_reports_message
      ON community_reports (message_id)
  `);

  console.log("community reports/moderation migration complete");
}

run()
  .catch((err) => {
    console.error("community reports/moderation migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
