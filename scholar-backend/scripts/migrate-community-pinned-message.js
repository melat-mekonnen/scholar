const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(
    `ALTER TABLE community_channels
     ADD COLUMN IF NOT EXISTS pinned_message_id UUID REFERENCES community_messages (id) ON DELETE SET NULL,
     ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
     ADD COLUMN IF NOT EXISTS pinned_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL`,
    [],
  );

  // eslint-disable-next-line no-console
  console.log("community pinned message migration complete");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("community pinned migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
