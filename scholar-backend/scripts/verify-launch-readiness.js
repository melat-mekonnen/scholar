/**
 * Milestone 5: run automated pre-launch checks (M1–M4 + API smoke).
 *
 * Usage:
 *   node scripts/verify-launch-readiness.js
 *   node scripts/verify-launch-readiness.js --production
 *   STAGING_API_URL=https://api.example.com node scripts/verify-launch-readiness.js --production
 */
const path = require("path");
const { execSync } = require("child_process");

const production = process.argv.includes("--production");
const cwd = path.join(__dirname, "..");
const root = path.join(__dirname, "../..");

function run(title, command, opts = {}) {
  // eslint-disable-next-line no-console
  console.log(`\n=== ${title} ===\n`);
  execSync(command, {
    stdio: "inherit",
    cwd: opts.cwd || cwd,
    env: { ...process.env, ...opts.env },
  });
}

// eslint-disable-next-line no-console
console.log(production ? "Launch readiness (production)\n" : "Launch readiness (local)\n");

const steps = [
  {
    title: "Environment (M1)",
    cmd: production
      ? "npm run verify:deploy-env -- --production"
      : "npm run verify:deploy-env",
  },
  { title: "Database schema (M2)", cmd: "npm run verify:db" },
  {
    title: "Staging URLs (M3)",
    cmd: production ? "npm run verify:staging" : "npm run verify:deploy-prep",
  },
  {
    title: "Production runtime (M4)",
    cmd: production ? "npm run verify:runtime:prod" : "npm run verify:runtime",
  },
  { title: "API smoke", cmd: "npm run smoke:api" },
];

for (const step of steps) {
  run(step.title, step.cmd);
}

// Frontend typecheck (M5)
run("Frontend TypeScript (M5)", "npm run typecheck", { cwd: path.join(root, "scholar-f") });

// eslint-disable-next-line no-console
console.log("\n=== Manual launch checklist (M5) ===\n");
const manual = [
  "Browser: browse scholarships, login, Google OAuth on staging",
  "Role routes: student /dashboard, manager /manager, owner /owner, admin /admin",
  "Community upload/download if you ship attachments",
  "Billing: Stripe/Chapa webhooks on HTTPS if Pro is live",
  "npm run verify:role-routing (with VERIFY_API_BASE_URL) after test users exist",
  "Supabase backups enabled; secrets only on host, not in git",
];
manual.forEach((line) => console.log(`  [ ] ${line}`));

// eslint-disable-next-line no-console
console.log("\n✓ Automated launch checks passed.");
// eslint-disable-next-line no-console
console.log("Complete the manual items above, then deploy.");
