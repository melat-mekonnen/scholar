const bcrypt = require("bcryptjs");
const { Client } = require('pg');
require('dotenv').config();

async function testPassword() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const result = await client.query("SELECT email, password_hash FROM users WHERE email = 'admin.role.test@scholar.local'");
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('User found:', user.email);
      console.log('Password hash exists:', !!user.password_hash);

      // Test password
      const testPassword = 'ScholarTest1!';
      const match = await bcrypt.compare(testPassword, user.password_hash);
      console.log('Password matches:', match);
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

testPassword();