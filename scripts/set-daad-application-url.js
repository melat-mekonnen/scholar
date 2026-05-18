/**
 * Sets application_url for DAAD-related scholarships (title/description contains "daad").
 * Official DAAD scholarship search & application entry point.
 *
 * Run: node scripts/set-daad-application-url.js
 */
require("dotenv").config();
const { Pool } = require("pg");

const DAAD_APPLICATION_URL =
  "https://www.daad.de/en/study-and-research-in-germany/scholarships/database-of-international-programmes/";

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
    const result = await pool.query(
      `UPDATE scholarships
       SET application_url = $1,
           updated_at = NOW()
       WHERE LOWER(COALESCE(title, '')) LIKE '%daad%'
          OR LOWER(COALESCE(description, '')) LIKE '%daad%'`,
      [DAAD_APPLICATION_URL]
    );
    console.log(`Updated ${result.rowCount} scholarship row(s) with DAAD application URL.`);
    if (result.rowCount === 0) {
      console.log(
        "No rows matched. Add a scholarship with 'DAAD' in the title or description, then run again."
      );
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
