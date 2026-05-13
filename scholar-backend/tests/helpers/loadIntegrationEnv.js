/**
 * Load backend `.env` before `src/app` is required so integration tests can boot.
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const backendRoot = path.join(__dirname, "..", "..");
const envPath = path.join(backendRoot, ".env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const REQUIRED_FOR_APP = [
  "DATABASE_URL",
  "JWT_SECRET",
  "FRONTEND_APP_URL",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",
];

function integrationEnvReady() {
  const missing = REQUIRED_FOR_APP.filter((k) => !process.env[k]);
  return { ok: missing.length === 0, missing, backendRoot };
}

module.exports = { integrationEnvReady, backendRoot };
