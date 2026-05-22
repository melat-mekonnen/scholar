/**
 * OpenRouter: LLM description refine + Amharic translation (optional).
 */
require("dotenv").config();

const { pool } = require("../../src/infra/db/neonClient");
const { env } = require("../../src/config/env");
const { runScript } = require("../lib/run");

async function main() {
  if (!env.openRouterApiKey) {
    // eslint-disable-next-line no-console
    console.error(
      "OPENROUTER_API_KEY is required. Create one at https://openrouter.ai/keys and set AI_DESCRIPTION_REFINE_ENABLED=true",
    );
    process.exit(1);
  }

  process.env.AI_DESCRIPTION_REFINE_ENABLED = "true";
  process.env.AI_TRANSLATION_ENABLED = "true";

  runScript("scholarships/enrich-descriptions.js", "--all --translate");

  const counts = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM scholarships
        WHERE status = 'verified' AND title_am IS NOT NULL AND description_am IS NOT NULL) AS translated,
       (SELECT COUNT(*)::int FROM scholarships WHERE status = 'verified') AS verified_total`,
  );
  const row = counts.rows[0];
  // eslint-disable-next-line no-console
  console.log("OpenRouter translation:", row);

  const minTranslated = Math.floor(Number(row.verified_total) * 0.5);
  if (Number(row.translated) < minTranslated) {
    // eslint-disable-next-line no-console
    console.error(`Translation incomplete: ${row.translated}/${row.verified_total} have Amharic content`);
    process.exitCode = 1;
  } else {
    // eslint-disable-next-line no-console
    console.log(`Translation complete: ${row.translated} scholarships with Amharic content.`);
  }

  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
