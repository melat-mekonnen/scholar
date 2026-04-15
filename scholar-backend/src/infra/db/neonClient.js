const { Pool } = require("pg");
const { env } = require("../../config/env");

const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: {
    rejectUnauthorized: false,
  },
});

pool.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("Unexpected Postgres client error", err);
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = {
  pool,
  query,
};

