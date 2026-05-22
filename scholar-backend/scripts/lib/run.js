const { execSync } = require("child_process");
const path = require("path");

/** Repository root (`scholar-backend/`). */
const PROJECT_ROOT = path.join(__dirname, "../..");

/**
 * Run a script under `scripts/` relative to project root.
 * @param {string} scriptPath e.g. `scholarships/sync-leaf-catalog.js`
 * @param {string} [args] extra CLI args
 */
function runScript(scriptPath, args = "") {
  const fullPath = path.join(PROJECT_ROOT, "scripts", scriptPath);
  const cmd = `node ${JSON.stringify(fullPath)}${args ? ` ${args}` : ""}`;
  execSync(cmd, { stdio: "inherit", env: process.env, cwd: PROJECT_ROOT });
}

module.exports = {
  PROJECT_ROOT,
  runScript,
};
