const { Client } = require('pg');
require('dotenv').config();

async function checkAdmin() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const result = await client.query("SELECT email, role, is_active, password_hash FROM users WHERE email = 'admin@ethioscholar.com'");
    console.log('Admin user:', result.rows[0]);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkAdmin();