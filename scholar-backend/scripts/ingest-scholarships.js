require("dotenv").config();

const { runScholarshipIngestion } = require("../src/modules/scholarship-ingestion/runScholarshipIngestion");

function parseArg(name, fallback) {
  const arg = process.argv.find((part) => part.startsWith(`--${name}=`));
  if (!arg) return fallback;
  return arg.slice(name.length + 3);
}

async function main() {
  const source = parseArg("source", "africa");
  const forcePublishStatus = parseArg("publishStatus", "") || null;
  const result = await runScholarshipIngestion({ source, forcePublishStatus });
  // eslint-disable-next-line no-console
  console.log(
    `Ingestion completed: run=${result.runId} source=${result.sourceName} fetched=${result.fetched} upserted=${result.upserted} failed=${result.failed} skipped=${result.skipped ?? 0}`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Ingestion failed:", err);
  process.exit(1);
});
