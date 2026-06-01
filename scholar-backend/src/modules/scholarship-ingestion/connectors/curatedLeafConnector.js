const { buildRecordsFromProgrammeList } = require("./buildRecordsFromProgrammeList");
const {
  buildLeafImportRecords,
  scrapeProgrammesWithDescriptions,
  catalogSummary,
} = require("../leafProgrammes/assembleLeafCatalog");

const CURATED_FETCH = { timeout: 28000, retries: 1, baseDelayMs: 500 };

async function fetchCuratedLeafScholarships() {
  const leafRecords = buildLeafImportRecords();
  const scrapedRecords = await buildRecordsFromProgrammeList(scrapeProgrammesWithDescriptions(), {
    delayMs: 350,
    fetchOptions: CURATED_FETCH,
    allowTrustedFallback: true,
  });

  const summary = catalogSummary();
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.info("[curated-leaf] catalog:", JSON.stringify(summary));
  }

  return [...leafRecords, ...scrapedRecords];
}

module.exports = {
  fetchCuratedLeafScholarships,
  catalogSummary,
};
