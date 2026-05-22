/**
 * @deprecated Use ingest-africa-scale.js (DAAD skipped — too slow / unreliable).
 */
require("dotenv").config();
const { execSync } = require("child_process");

execSync("node scripts/ingest-africa-scale.js", { stdio: "inherit", env: process.env });
