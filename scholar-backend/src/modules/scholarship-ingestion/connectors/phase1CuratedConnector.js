const { buildRecordsFromProgrammeList } = require("./buildRecordsFromProgrammeList");
const {
  buildLeafImportRecords,
  phase1ScrapeProgrammesWithDescriptions,
  catalogSummary,
} = require("../leafProgrammes/assembleLeafCatalog");

const PHASE1_FETCH = { timeout: 28000, retries: 1, baseDelayMs: 500 };

async function fetchPhase1CuratedScholarships() {
  const leafRecords = buildLeafImportRecords();
  const scrapedRecords = await buildRecordsFromProgrammeList(phase1ScrapeProgrammesWithDescriptions(), {
    delayMs: 350,
    fetchOptions: PHASE1_FETCH,
    allowTrustedFallback: true,
  });

  const summary = catalogSummary();
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console
    console.info("[phase1] leaf catalog:", JSON.stringify(summary));
  }

  return [...leafRecords, ...scrapedRecords];
}

module.exports = {
  fetchPhase1CuratedScholarships,
  catalogSummary,
};
