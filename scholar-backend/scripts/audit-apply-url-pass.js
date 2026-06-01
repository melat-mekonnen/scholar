/**
 * Full apply-URL audit pass:
 *   1. Run known URL corrections (fix-catalog-url-corrections.js)
 *   2. Reject/mark closed via verify-application-urls.js --apply
 *   3. Re-export visible-scholarships-urls.csv
 *
 * Usage:
 *   node scripts/audit-apply-url-pass.js
 */
require("dotenv").config();

const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

function run(script, args = []) {
  const result = spawnSync("node", [path.join("scripts", script), ...args], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${script} exited with code ${result.status}`);
  }
}

async function main() {
  // eslint-disable-next-line no-console
  console.log("Step 1/3: Applying known URL corrections…");
  run("fix-catalog-url-corrections.js");

  // eslint-disable-next-line no-console
  console.log("\nStep 2/3: Verifying all verified apply URLs (reject dead, mark closed)…");
  run("verify-application-urls.js", ["--apply", "--concurrency=8", "--report=/tmp/apply-url-audit.json"]);

  // eslint-disable-next-line no-console
  console.log("\nStep 3/3: Re-export visible CSV…");
  run("fix-catalog-url-corrections.js");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
