const { Client } = require('pg');
require('dotenv').config();

async function checkUsers() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();
    const result = await client.query("SELECT email, role FROM users WHERE email LIKE '%.role.test@scholar.local'");
    console.log('Test users in database:');
    console.log(result.rows);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkUsers();