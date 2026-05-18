/**
 * One-shot migration: adds scholarships.application_url if missing.
 * Run: node scripts/add-application-url-column.js
 */
require("dotenv").config();
const { Pool } = require("pg");

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await pool.query(
      "ALTER TABLE scholarships ADD COLUMN IF NOT EXISTS application_url TEXT"
    );
    console.log("OK: scholarships.application_url is present");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
