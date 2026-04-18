const { Pool } = require("pg");
const { env } = require("../../config/env");

const localDbPattern = /(localhost|127\.0\.0\.1)/i;
const disableSslPattern = /sslmode=disable/i;
const shouldUseSsl =
  !localDbPattern.test(env.databaseUrl) && !disableSslPattern.test(env.databaseUrl);

const pool = new Pool({
  connectionString: env.databaseUrl,
  ...(shouldUseSsl
    ? {
        ssl: {
          rejectUnauthorized: false,
        },
      }
    : {}),
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

