require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function applySchema() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL not set in .env");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  const schemaPath = path.join(__dirname, 'db', 'schema.sql');

  let schemaSql;
  try {
    schemaSql = fs.readFileSync(schemaPath, 'utf8');
  } catch (err) {
    console.error("Failed to read schema.sql:", err);
    process.exit(1);
  }

  try {
    // Split SQL by semicolons and execute each statement
    const statements = schemaSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length);

    for (const stmt of statements) {
      await pool.query(stmt);
    }

    console.log("Schema applied successfully 🚀");
  } catch (err) {
    console.error("Failed to apply schema:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

applySchema();
