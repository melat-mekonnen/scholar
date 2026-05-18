const { query, pool } = require("../src/infra/db/neonClient");

async function run() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      actor_user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id UUID,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
      ON admin_audit_logs (created_at DESC);
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor
      ON admin_audit_logs (actor_user_id, created_at DESC);
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action
      ON admin_audit_logs (action);
  `);

  // eslint-disable-next-line no-console
  console.log("admin_audit_logs migration complete");
}

run()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("admin_audit_logs migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
