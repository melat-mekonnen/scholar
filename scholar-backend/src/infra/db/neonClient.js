const { Pool } = require("pg");
const { env } = require("../../config/env");

const localDbPattern = /(localhost|127\.0\.0\.1)/i;
const disableSslPattern = /sslmode=disable/i;

function stripSslModeFromUrl(databaseUrl) {
  try {
    const normalized = databaseUrl.replace(/^postgres:\/\//i, "postgresql://");
    const parsed = new URL(normalized);
    parsed.searchParams.delete("sslmode");
    let out = parsed.toString();
    return out.replace(/^postgresql:\/\//i, "postgres://");
  } catch {
    return databaseUrl;
  }
}

const shouldUseSsl =
  !localDbPattern.test(env.databaseUrl) && !disableSslPattern.test(env.databaseUrl);

const connectionString = shouldUseSsl
  ? stripSslModeFromUrl(env.databaseUrl)
  : env.databaseUrl;

const pool = new Pool({
  connectionString,
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
