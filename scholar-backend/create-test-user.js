const bcrypt = require("bcryptjs");
const { Client } = require('pg');
require('dotenv').config();

async function createTestUser() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();

    // Hash the password
    const password = 'admin@123';
    const passwordHash = await bcrypt.hash(password, 10);

    // Insert admin user if missing
    await client.query(
      `INSERT INTO users (full_name, email, password_hash, auth_provider, role, is_active)
       VALUES ($1, $2, $3, 'local', $4, TRUE)
       ON CONFLICT (email) DO UPDATE SET
         full_name = EXCLUDED.full_name,
         password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         auth_provider = 'local',
         is_active = TRUE,
         updated_at = NOW()`,
      ['Ethiopian Scholar Admin', 'admin@ethioscholar.com', passwordHash, 'admin']
    );

    console.log('Created or updated admin user:');
    console.log('Email: admin@ethioscholar.com');
    console.log('Password: admin@123');
    console.log('Role: admin');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

createTestUser();