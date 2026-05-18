const { query, pool } = require("../src/infra/db/neonClient");

async function run() {
  await query(`
    UPDATE applications
    SET status = 'saved'
    WHERE status = 'pending'
  `);

  await query(`
    ALTER TABLE applications
    DROP CONSTRAINT IF EXISTS applications_status_check
  `);
  await query(`
    ALTER TABLE applications
    ADD CONSTRAINT applications_status_check
    CHECK (status IN ('saved', 'preparing', 'submitted', 'accepted', 'rejected'))
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS application_notes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      application_id UUID NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      note TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_application_notes_application
      ON application_notes (application_id, created_at ASC)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_application_notes_user
      ON application_notes (user_id, created_at DESC)
  `);

  console.log("applications milestone8 migration complete");
}

run()
  .catch((err) => {
    console.error("applications milestone8 migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
