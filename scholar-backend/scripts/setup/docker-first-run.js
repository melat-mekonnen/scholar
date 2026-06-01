/**
 * Docker one-shot: ensure schema, then bootstrap scholarship + programme data.
 */
require("dotenv").config();

const { runScript } = require("../lib/run");

async function main() {
  runScript("db/ensure-schema.js");
  runScript("setup/bootstrap-data.js");
  // eslint-disable-next-line no-console
  console.log("Docker first-run complete.");
  // eslint-disable-next-line no-console
  console.log("Optional OpenRouter: npm run ai:translate-openrouter");
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
