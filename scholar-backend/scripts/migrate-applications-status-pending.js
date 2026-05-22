/**
 * Align applications.status with student tracker (pending → submitted flow).
 * Older milestone8 used saved/preparing; app + schema.sql use pending.
 *
 * Run: npm run migrate:applications-status
 */
require("dotenv").config();
const { Pool } = require("pg");

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
    await pool.query(`ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check`);
    await pool.query(`
      UPDATE applications
      SET status = 'pending', updated_at = NOW()
      WHERE status IN ('saved', 'preparing')
    `);
    await pool.query(`
      ALTER TABLE applications
      ADD CONSTRAINT applications_status_check
      CHECK (status IN ('pending', 'submitted', 'accepted', 'rejected'))
    `);
    console.log("OK: applications status constraint now allows pending, submitted, accepted, rejected");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
