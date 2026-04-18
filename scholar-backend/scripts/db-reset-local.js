/**
 * Drops `public` and reapplies db/schema.sql (local dev only).
 * Requires: CONFIRM_DB_RESET=yes in environment.
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
require("dotenv").config();

async function runSqlFile(client, filePath) {
  const sql = fs.readFileSync(filePath, "utf8");
  await client.query(sql);
}

async function main() {
  if (process.env.CONFIRM_DB_RESET !== "yes") {
    // eslint-disable-next-line no-console
    console.error(
      "Refusing to reset database. Set CONFIRM_DB_RESET=yes (local dev only)."
    );
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    // eslint-disable-next-line no-console
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const resetPath = path.join(__dirname, "../db/00-dev-reset-public.sql");
  const schemaPath = path.join(__dirname, "../db/schema.sql");

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    // eslint-disable-next-line no-console
    console.log("Resetting public schema...");
    await runSqlFile(client, resetPath);
    // eslint-disable-next-line no-console
    console.log("Applying schema.sql...");
    await runSqlFile(client, schemaPath);
    // eslint-disable-next-line no-console
    console.log("Done. Restart the API server.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
