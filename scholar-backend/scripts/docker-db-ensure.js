/**
 * Ensure base schema exists (idempotent). Safe to run on every Docker boot.
 */
const fs = require("fs");
const path = require("path");
const { pool, query } = require("../src/infra/db/neonClient");

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  await query(sql, []);
}

async function main() {
  const check = await query(
    `SELECT to_regclass('public.scholarships') AS scholarships,
            to_regclass('public.study_programmes') AS programmes`,
    [],
  );
  const row = check.rows[0] || {};

  if (!row.scholarships) {
    // eslint-disable-next-line no-console
    console.log("Applying db/schema.sql (first run)...");
    await runSqlFile(path.join(__dirname, "../db/schema.sql"));
  } else {
    // eslint-disable-next-line no-console
    console.log("Base schema present — running phase migrations only.");
  }

  const migrations = [
    "migrate-scholarship-phases.js",
    "migrate-scholarship-ingestion-quality.js",
    "migrate-scholarship-intelligence.js",
    "migrate-community-tables.js",
    "migrate-community-reports-and-moderation.js",
    "migrate-community-pinned-message.js",
    "migrate-community-attachments.js",
    "migrate-community-message-edited.js",
  ];
  for (const script of migrations) {
    // eslint-disable-next-line no-console
    console.log(`Running ${script}...`);
    require("child_process").execSync(`node scripts/${script}`, {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
    });
  }

  // eslint-disable-next-line no-console
  console.log("Database ready.");
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
