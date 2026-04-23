const { runScholarshipIngestion } = require("../src/modules/scholarship-ingestion/runScholarshipIngestion");

function parseArg(name, fallback) {
  const arg = process.argv.find((part) => part.startsWith(`--${name}=`));
  if (!arg) return fallback;
  return arg.slice(name.length + 3);
}

async function main() {
  const source = parseArg("source", "daad");
  const publishStatus = parseArg("publishStatus", "verified");
  const result = await runScholarshipIngestion({ source, publishStatus });
  // eslint-disable-next-line no-console
  console.log(
    `Ingestion completed: run=${result.runId} source=${result.sourceName} fetched=${result.fetched} upserted=${result.upserted} failed=${result.failed} status=${result.publishStatus}`,
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("Ingestion failed:", err);
  process.exit(1);
});
