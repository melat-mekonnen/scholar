/**
 * Milestone 3: validate staging/production URL wiring before deploy.
 *
 * Usage:
 *   node scripts/verify-staging-config.js          # local prep + hints
 *   node scripts/verify-staging-config.js --staging  # strict HTTPS staging/prod URLs
 */
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const staging = process.argv.includes("--staging");
const errors = [];
const warnings = [];
const notes = [];

function error(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}
function note(msg) {
  notes.push(msg);
}

function parseUrl(raw, label) {
  try {
    return new URL(raw);
  } catch {
    error(`${label} is not a valid URL: ${raw}`);
    return null;
  }
}

const frontend = process.env.FRONTEND_APP_URL || process.env.STAGING_APP_URL || "";
const apiPublic =
  process.env.STAGING_API_URL ||
  process.env.PUBLIC_API_URL ||
  process.env.VERIFY_API_BASE_URL ||
  "";
const googleRedirect = process.env.GOOGLE_REDIRECT_URI || "";
const nextPublicApi = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const backendBuild = process.env.BACKEND_URL || "";

// eslint-disable-next-line no-console
console.log(staging ? "Staging deploy config check (strict)\n" : "Deploy config check (local-friendly)\n");

if (!frontend) {
  error("Missing FRONTEND_APP_URL (browser origin, e.g. https://app.example.com).");
} else {
  const u = parseUrl(frontend, "FRONTEND_APP_URL");
  if (u) {
    if (staging && u.protocol !== "https:") {
      error("FRONTEND_APP_URL must use https:// in staging/production.");
    }
    if (u.pathname !== "/" && u.pathname !== "") {
      warn("FRONTEND_APP_URL should be an origin only (no path), e.g. https://app.example.com");
    }
  }
}

if (!googleRedirect) {
  error("Missing GOOGLE_REDIRECT_URI.");
} else {
  const u = parseUrl(googleRedirect, "GOOGLE_REDIRECT_URI");
  if (u) {
    const expectedPath = "/auth/google/callback";
    if (!u.pathname.endsWith(expectedPath)) {
      error(`GOOGLE_REDIRECT_URI path must end with ${expectedPath}`);
    }
    if (staging && u.protocol !== "https:") {
      error("GOOGLE_REDIRECT_URI must use https:// in staging/production.");
    }
    if (apiPublic) {
      const api = parseUrl(apiPublic.replace(/\/$/, ""), "STAGING_API_URL");
      if (api) {
        const expected = `${api.origin}${expectedPath}`;
        if (googleRedirect !== expected && googleRedirect !== `${expected}/`) {
          warn(
            `GOOGLE_REDIRECT_URI (${googleRedirect}) should match ${expected} unless using a reverse proxy path.`,
          );
        }
      }
    }
  }
}

if (nextPublicApi && backendBuild) {
  warn("Both NEXT_PUBLIC_API_BASE_URL and BACKEND_URL are set — pick one deploy model (see docs/DEPLOY.md).");
}

if (nextPublicApi) {
  const u = parseUrl(nextPublicApi, "NEXT_PUBLIC_API_BASE_URL");
  if (u && staging && u.protocol !== "https:") {
    error("NEXT_PUBLIC_API_BASE_URL must use https:// in staging/production.");
  }
  note("Deploy model: split-origin (browser calls API host directly; CORS must allow FRONTEND_APP_URL).");
} else if (backendBuild && !/localhost|127\.0\.0\.1/i.test(backendBuild)) {
  note(
    `Deploy model: same-origin proxy — rebuild web when BACKEND_URL changes (current build target: ${backendBuild}).`,
  );
} else {
  note(
    "Deploy model: local/dev — Next rewrites /api/* to BACKEND_URL (default http://127.0.0.1:4000). Set at Docker/web build for staging.",
  );
}

if (staging && !apiPublic) {
  warn(
    "Set STAGING_API_URL (or PUBLIC_API_URL) to your public API origin for redirect URI checks and smoke tests.",
  );
}

if (process.env.CHAPA_SECRET_KEY && staging) {
  const callback = process.env.CHAPA_CALLBACK_URL || "";
  if (!callback || !callback.startsWith("https://")) {
    error("CHAPA_CALLBACK_URL must be a public https URL when CHAPA_SECRET_KEY is set.");
  }
}

if (staging) {
  const { execSync } = require("child_process");
  try {
    execSync("node scripts/verify-deploy-env.js --production", {
      stdio: "inherit",
      cwd: path.join(__dirname, ".."),
      env: process.env,
    });
  } catch {
    error("verify-deploy-env --production failed (fix env first).");
  }
}

if (warnings.length) {
  // eslint-disable-next-line no-console
  console.log("Warnings:");
  warnings.forEach((w) => console.log(`  ⚠ ${w}`));
  // eslint-disable-next-line no-console
  console.log("");
}

if (notes.length) {
  // eslint-disable-next-line no-console
  console.log("Notes:");
  notes.forEach((n) => console.log(`  · ${n}`));
  // eslint-disable-next-line no-console
  console.log("");
}

if (errors.length) {
  // eslint-disable-next-line no-console
  console.log("Errors:");
  errors.forEach((e) => console.log(`  ✗ ${e}`));
  // eslint-disable-next-line no-console
  console.log("\nSee docs/DEPLOY.md (Milestone 3) and .env.staging.example");
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log("✓ Staging URL configuration looks consistent.");
if (!staging) {
  // eslint-disable-next-line no-console
  console.log("Before deploy, run: npm run verify:staging");
}
