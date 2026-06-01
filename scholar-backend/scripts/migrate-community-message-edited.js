const { query, pool } = require("../src/infra/db/neonClient");

async function main() {
  await query(
    `ALTER TABLE community_messages
     ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ`,
    [],
  );

  // eslint-disable-next-line no-console
  console.log("community message edited_at migration complete");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("community message edited migration failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
