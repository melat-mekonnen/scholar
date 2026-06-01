const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(
    `ALTER TABLE community_messages
     DROP CONSTRAINT IF EXISTS community_messages_body_len`,
    [],
  );
  await query(
    `ALTER TABLE community_messages
     ADD CONSTRAINT community_messages_body_len
     CHECK (char_length(body) >= 0 AND char_length(body) <= 8000)`,
    [],
  );

  await query(
    `CREATE TABLE IF NOT EXISTS community_message_attachments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      message_id UUID NOT NULL REFERENCES community_messages (id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('image', 'pdf', 'cv')),
      file_path TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`,
    [],
  );

  await query(
    `CREATE INDEX IF NOT EXISTS idx_community_message_attachments_message
     ON community_message_attachments (message_id)`,
    [],
  );

  // eslint-disable-next-line no-console
  console.log("community message attachments migration complete");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("community attachments migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
