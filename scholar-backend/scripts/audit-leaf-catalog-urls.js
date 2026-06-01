/**
 * Report curated catalog URL quality issues (no DB writes).
 * Run: node scripts/audit-leaf-catalog-urls.js
 */
const {
  buildLeafImportRecords,
  scrapeProgrammesWithDescriptions,
} = require("../src/modules/scholarship-ingestion/leafProgrammes/assembleLeafCatalog");
const { buildLeafProgrammeRecord } = require("../src/modules/scholarship-ingestion/leafProgrammes/buildLeafProgrammeRecord");
const { auditCuratedCatalogRecords } = require("../src/modules/scholarship-ingestion/leafProgrammes/leafApplyUrl");

function scrapeRecords() {
  return scrapeProgrammesWithDescriptions()
    .map((programme) =>
      buildLeafProgrammeRecord({
        externalId: programme.externalId,
        title: programme.titleHint || programme.externalId,
        organizationName: programme.organizationName,
        country: programme.country,
        degreeLevel: programme.degreeLevel,
        fieldOfStudy: programme.fieldOfStudy || "multiple disciplines",
        fundingType: programme.fundingType || "fully_funded",
        url: programme.url,
        description: `${programme.curatedDescription || programme.titleHint}. ${"x".repeat(120)}`,
        descriptionFromSite: false,
      }),
    )
    .filter(Boolean);
}

const records = [...buildLeafImportRecords(), ...scrapeRecords()];
const problems = auditCuratedCatalogRecords(records);

// eslint-disable-next-line no-console
console.log(
  JSON.stringify(
    {
      totalRecords: records.length,
      problemCount: problems.length,
      problems,
    },
    null,
    2,
  ),
);

if (problems.length > 0) process.exit(1);
