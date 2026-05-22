const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildLeafImportRecords,
  scrapeProgrammesWithDescriptions,
} = require("../src/modules/scholarship-ingestion/leafProgrammes/assembleLeafCatalog");
const { buildLeafProgrammeRecord } = require("../src/modules/scholarship-ingestion/leafProgrammes/buildLeafProgrammeRecord");
const {
  auditCuratedCatalogRecords,
  isGenericMultiCountryApplyPortal,
} = require("../src/modules/scholarship-ingestion/leafProgrammes/leafApplyUrl");

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

test("Commonwealth Shared placements use CSC university contact URLs", () => {
  const { commonwealthSharedLeafProgrammes } = require("../src/modules/scholarship-ingestion/leafProgrammes/commonwealthSharedUniversities");
  const { sharedUniversityCourseProgrammes } = require("../src/modules/scholarship-ingestion/leafProgrammes/sharedUniversityCourses");
  const { isCscSharedGenericUrl } = require("../src/modules/scholarship-ingestion/leafProgrammes/leafApplyUrl");

  for (const record of [...commonwealthSharedLeafProgrammes(), ...sharedUniversityCourseProgrammes()]) {
    assert.ok(
      !isCscSharedGenericUrl(record.applicationUrl),
      `${record.title} must not use generic CSC Shared scheme URL: ${record.applicationUrl}`,
    );
    assert.match(
      record.applicationUrl,
      /^https:\/\//,
      record.title,
    );
  }
});

test("curated catalog has no generic apply portals or listing hubs", () => {
  const records = [...buildLeafImportRecords(), ...scrapeRecords()];
  const problems = auditCuratedCatalogRecords(records);

  assert.equal(
    problems.length,
    0,
    `URL audit failures:\n${problems
      .slice(0, 20)
      .map((p) => `- [${p.issues.join(",")}] ${p.title}\n  ${p.applicationUrl}`)
      .join("\n")}`,
  );
});

test("Chevening and Fulbright avoid multi-country apply pickers", () => {
  const records = [...buildLeafImportRecords(), ...scrapeRecords()];
  const flagged = records.filter((record) =>
    isGenericMultiCountryApplyPortal(record.applicationUrl),
  );
  assert.equal(flagged.length, 0, flagged.map((r) => r.title).join(", "));
});

test("curated rows keep application and source URLs aligned", () => {
  for (const record of buildLeafImportRecords()) {
    const { baseUrlWithoutHash } = require("../src/modules/scholarship-ingestion/leafProgrammes/leafApplyUrl");
    assert.equal(
      baseUrlWithoutHash(record.applicationUrl),
      baseUrlWithoutHash(record.sourceUrl),
      record.title,
    );
  }
});
