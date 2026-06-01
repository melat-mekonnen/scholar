/**
 * Pre-deploy environment checks (Milestone 1).
 * Does not print secret values.
 *
 * Usage:
 *   node scripts/verify-deploy-env.js
 *   node scripts/verify-deploy-env.js --production
 */
const path = require("path");
const fs = require("fs");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const production = process.argv.includes("--production");
const errors = [];
const warnings = [];

const PLACEHOLDER_PATTERNS = [
  /replace_me/i,
  /replace_with/i,
  /change_me/i,
  /docker-dev-jwt/i,
  /your_jwt_secret/i,
  /not-configured/i,
];

const LOCAL_HOST = /localhost|127\.0\.0\.1/i;

function error(msg) {
  errors.push(msg);
}

function warn(msg) {
  warnings.push(msg);
}

function isPlaceholder(value) {
  if (!value || typeof value !== "string") return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(value));
}

function parseDatabaseUrl(raw) {
  try {
    const u = new URL(raw);
    return {
      host: u.hostname,
      isLocal: LOCAL_HOST.test(u.hostname),
      sslDisable: /sslmode=disable/i.test(raw),
      sslRequire: /sslmode=require/i.test(raw),
      userInfo: u.username ? `${u.username}:${u.password || ""}` : "",
      hasEncodedComma: raw.includes("%2C") || raw.includes("%2c"),
    };
  } catch {
    return null;
  }
}

function normalizeDatabaseUrl(raw) {
  let value = String(raw || "").trim();
  if (value.startsWith("DATABASE_URL=")) {
    value = value.slice("DATABASE_URL=".length).trim();
  }
  return value;
}

// --- JWT ---
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  error("Missing JWT_SECRET (set in scholar-backend/.env or repo root .env).");
} else if (isPlaceholder(jwtSecret)) {
  error("JWT_SECRET looks like a placeholder — generate a random secret (see docs/DEPLOY.md).");
} else if (jwtSecret.length < 32) {
  warn("JWT_SECRET is shorter than 32 characters — use at least 32 random bytes.");
}

// --- DATABASE_URL ---
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  error("Missing DATABASE_URL.");
} else {
  if (/^DATABASE_URL=/i.test(databaseUrl.trim())) {
    error(
      'DATABASE_URL value looks duplicated (e.g. DATABASE_URL=DATABASE_URL=postgresql://...) — use a single "DATABASE_URL=postgresql://..." line.',
    );
  }
  databaseUrl = normalizeDatabaseUrl(databaseUrl);
  const db = parseDatabaseUrl(databaseUrl);
  if (!db) {
    error("DATABASE_URL is not a valid URL — check for typos, spaces, or missing URL-encoding in the password.");
  } else {
    if (production && db.isLocal) {
      error("--production: DATABASE_URL must not point at localhost.");
    }
    if (!db.isLocal) {
      if (db.sslDisable) {
        error("Remote DATABASE_URL must not use sslmode=disable.");
      }
      if (!db.sslRequire) {
        warn("Remote DATABASE_URL should include ?sslmode=require (see docs/DEPLOY.md).");
      }
      if (databaseUrl.includes(",") && !db.hasEncodedComma) {
        const credsMatch = databaseUrl.match(/^[^:]+:\/\/([^@/]+)@/);
        if (credsMatch && credsMatch[1].includes(",")) {
          error(
            "DATABASE_URL password likely contains commas — URL-encode them (%2C) or use Supabase Copy URI.",
          );
        }
      }
      if (db.host.includes("db.") && db.host.endsWith(".supabase.co")) {
        warn(
          "Direct db.*.supabase.co host is IPv6-only on some networks — prefer session pooler (aws-*-*.pooler.supabase.com:6543) for the app.",
        );
      }
    }
  }
}

// --- Frontend + OAuth ---
const frontendUrl = process.env.FRONTEND_APP_URL;
if (!frontendUrl) {
  error("Missing FRONTEND_APP_URL.");
} else if (production && LOCAL_HOST.test(frontendUrl)) {
  error("--production: FRONTEND_APP_URL must be your public https origin.");
}

const googleId = process.env.GOOGLE_CLIENT_ID;
const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRedirect = process.env.GOOGLE_REDIRECT_URI;

if (!googleId || !googleSecret || !googleRedirect) {
  error("Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI.");
} else {
  if (isPlaceholder(googleId) || isPlaceholder(googleSecret)) {
    error("Google OAuth credentials look like placeholders.");
  }
  if (production && LOCAL_HOST.test(googleRedirect)) {
    error("--production: GOOGLE_REDIRECT_URI must use your public API https URL.");
  }
}

// --- Production-only recommendations ---
if (production) {
  if (process.env.NODE_ENV !== "production") {
    warn("NODE_ENV is not set to 'production' on the host (recommended for deployed API).");
  }
  if (process.env.INGESTION_ENABLED === "true") {
    warn("INGESTION_ENABLED=true on production API — consider false unless this host runs ingest jobs.");
  }
  const chapaCallback = process.env.CHAPA_CALLBACK_URL || "";
  if (process.env.CHAPA_SECRET_KEY && (!chapaCallback || LOCAL_HOST.test(chapaCallback))) {
    warn("CHAPA_SECRET_KEY is set but CHAPA_CALLBACK_URL is missing or localhost — billing webhooks will fail.");
  }
}

// --- Env file hygiene (informational) ---
const backendEnvPath = path.join(__dirname, "../.env");
const rootEnvPath = path.join(__dirname, "../../.env");
if (!fs.existsSync(backendEnvPath) && fs.existsSync(rootEnvPath)) {
  warn(
    "scholar-backend/.env is missing but repo root .env exists — API started from scholar-backend/ may not see DATABASE_URL.",
  );
}

// --- Report ---
// eslint-disable-next-line no-console
console.log(production ? "Deploy env check (production mode)\n" : "Deploy env check (development mode)\n");

if (warnings.length) {
  // eslint-disable-next-line no-console
  console.log("Warnings:");
  warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  // eslint-disable-next-line no-console
  console.log("");
}

if (errors.length) {
  // eslint-disable-next-line no-console
  console.log("Errors:");
  errors.forEach((e) => console.log(`  ✗ ${e}`));
  // eslint-disable-next-line no-console
  console.log("\nSee docs/DEPLOY.md (Milestone 1).");
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log("✓ Required variables present.");
if (production) {
  // eslint-disable-next-line no-console
  console.log("✓ Production-mode checks passed.");
} else {
  // eslint-disable-next-line no-console
  console.log("Run with --production before staging/prod deploy.");
}
if (warnings.length === 0) {
  // eslint-disable-next-line no-console
  console.log("No warnings.");
}

// Hint for generating JWT without printing existing secret
if (!production && jwtSecret && !isPlaceholder(jwtSecret)) {
  // eslint-disable-next-line no-console
  console.log("\nTo rotate JWT_SECRET: node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"");
}
