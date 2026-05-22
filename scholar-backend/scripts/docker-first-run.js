/**
 * Docker one-shot: ensure schema → ingest leaf catalog → seed programmes → refine descriptions.
 */
require("dotenv").config();

const { execSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env, cwd: root });
}

async function main() {
  run("node scripts/docker-db-ensure.js");
  run("node scripts/finish-phase0.js");
  run("node scripts/seed-study-programmes.js");
  // eslint-disable-next-line no-console
  console.log("Docker first-run setup complete.");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
