/**
 * Ensure base schema exists (idempotent). Safe to run on every Docker boot.
 */
const fs = require("fs");
const path = require("path");
const { pool, query } = require("../../src/infra/db/neonClient");

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
    await runSqlFile(path.join(__dirname, "../../../db/schema.sql"));
  } else {
    // eslint-disable-next-line no-console
    console.log("Base schema present — running content migrations only.");
  }

  const rootCwd = path.join(__dirname, "../..");
  const migrations = [
    "scripts/db/migrations/migrate-content-schema.js",
    "scripts/migrate-scholarship-ingestion-quality.js",
    "scripts/migrate-scholarship-intelligence.js",
    "scripts/migrate-community-tables.js",
    "scripts/migrate-community-reports-and-moderation.js",
    "scripts/migrate-community-pinned-message.js",
    "scripts/migrate-community-attachments.js",
    "scripts/migrate-community-message-edited.js",
  ];
  for (const script of migrations) {
    // eslint-disable-next-line no-console
    console.log(`Running ${script}...`);
    require("child_process").execSync(`node ${script}`, {
      stdio: "inherit",
      cwd: rootCwd,
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
