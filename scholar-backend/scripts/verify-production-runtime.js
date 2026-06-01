/**
 * Milestone 4: production runtime checks (uploads, jobs, ingestion).
 *
 * Usage:
 *   node scripts/verify-production-runtime.js
 *   node scripts/verify-production-runtime.js --production
 */
const path = require("path");
const fs = require("fs");

require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const production = process.argv.includes("--production");
const errors = [];
const warnings = [];

function error(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || raw === "") return defaultValue;
  return !["0", "false", "no", "off"].includes(String(raw).toLowerCase());
}

// eslint-disable-next-line no-console
console.log(production ? "Production runtime check (strict)\n" : "Production runtime check (local-friendly)\n");

if (envBool("INGESTION_ENABLED")) {
  if (production) {
    error("INGESTION_ENABLED=true on user-facing API — set false unless this host only runs ingest jobs.");
  } else {
    warn("INGESTION_ENABLED=true — disable on production API servers.");
  }
}

const reminderOn = envBool("DEADLINE_REMINDER_ENABLED", true);
const followUpOn = envBool("APPLY_FOLLOWUP_ENABLED", true);
const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

if ((reminderOn || followUpOn) && !smtpConfigured) {
  if (production) {
    error(
      "Email jobs enabled (DEADLINE_REMINDER_ENABLED / APPLY_FOLLOWUP_ENABLED) but SMTP is incomplete — configure SMTP_* or set those flags to false.",
    );
  } else {
    warn("Email jobs enabled without full SMTP_* — reminders will not send until SMTP is configured.");
  }
}

if (production && !process.env.UPLOADS_ROOT) {
  warn(
    "UPLOADS_ROOT is not set — uploads use ephemeral disk inside the container (lost on redeploy). Mount a volume and set UPLOADS_ROOT=/app/uploads.",
  );
}

const uploadsRoot = process.env.UPLOADS_ROOT || path.join(process.cwd(), "uploads");
try {
  fs.mkdirSync(uploadsRoot, { recursive: true });
  fs.accessSync(uploadsRoot, fs.constants.W_OK);
  // eslint-disable-next-line no-console
  console.log(`Uploads directory: ${path.resolve(uploadsRoot)} (writable)`);
} catch {
  error(`Uploads directory not writable: ${path.resolve(uploadsRoot)}`);
}

if (production && envBool("BACKGROUND_JOBS_ENABLED", true)) {
  warn(
    "Run a single API replica until jobs are moved to a worker — multiple instances can duplicate reminder emails.",
  );
}

if (!envBool("BACKGROUND_JOBS_ENABLED", true)) {
  // eslint-disable-next-line no-console
  console.log("Background jobs: disabled (BACKGROUND_JOBS_ENABLED=false)");
} else {
  // eslint-disable-next-line no-console
  console.log(
    `Background jobs: expiry=on | reminders=${reminderOn ? "on" : "off"} | follow-up=${followUpOn ? "on" : "off"}`,
  );
}

if (warnings.length) {
  // eslint-disable-next-line no-console
  console.log("\nWarnings:");
  warnings.forEach((w) => console.log(`  ⚠ ${w}`));
}

if (errors.length) {
  // eslint-disable-next-line no-console
  console.log("\nErrors:");
  errors.forEach((e) => console.log(`  ✗ ${e}`));
  // eslint-disable-next-line no-console
  console.log("\nSee docs/DEPLOY.md (Milestone 4).");
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log("\n✓ Production runtime configuration OK.");
if (!production) {
  // eslint-disable-next-line no-console
  console.log("Before deploy, run: npm run verify:runtime -- --production");
}
