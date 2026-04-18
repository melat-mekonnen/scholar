/**
 * Creates manager_profiles for existing databases. New installs: use db/schema.sql.
 */
const { query, pool } = require("../src/infra/db/neonClient");

const DDL = `
CREATE TABLE IF NOT EXISTS manager_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  job_title TEXT,
  organization_name TEXT,
  bio TEXT,
  public_contact_email TEXT,
  website_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function main() {
  await query(DDL, []);
  // eslint-disable-next-line no-console
  console.log("OK: manager_profiles table ready.");
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
