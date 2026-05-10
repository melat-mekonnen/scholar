const { Client } = require('pg');
require('dotenv').config({path: './.env'});
const bcrypt = require('bcryptjs');

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const hash = await bcrypt.hash('ScholarTest1!', 10);
  await client.query("INSERT INTO users (full_name, email, password_hash, auth_provider, role, plan_type) VALUES ('Manager User', 'manager@scholar.local', $1, 'local', 'manager', 'free') ON CONFLICT (email) DO NOTHING", [hash]);
  await client.end();
  console.log('Manager created');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
