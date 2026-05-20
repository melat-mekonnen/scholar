const test = require("node:test");
const assert = require("node:assert/strict");
const { buildLeafProgrammeRecord, buildLeafRecordsFromList } = require("../src/modules/scholarship-ingestion/leafProgrammes/buildLeafProgrammeRecord");
const { commonwealthSharedLeafProgrammes } = require("../src/modules/scholarship-ingestion/leafProgrammes/commonwealthSharedUniversities");
const { catalogSummary } = require("../src/modules/scholarship-ingestion/leafProgrammes/assembleLeafCatalog");

test("buildLeafProgrammeRecord produces apply and source URLs", () => {
  const record = buildLeafProgrammeRecord({
    externalId: "test-leaf",
    title: "Test Scholarship — Example University",
    organizationName: "Example University",
    country: "United Kingdom",
    url: "https://example.ac.uk/scholarships/test/",
    description: "A".repeat(150),
  });
  assert.ok(record);
  assert.equal(record.applicationUrl, "https://example.ac.uk/scholarships/test/");
  assert.equal(record.sourceUrl, "https://example.ac.uk/scholarships/test/");
});

test("commonwealth shared leaf catalog has 44 university placements", () => {
  const records = buildLeafRecordsFromList(commonwealthSharedLeafProgrammes());
  assert.equal(records.length, 44);
});

test("leaf catalog summary exceeds legacy phase1 count", () => {
  const summary = catalogSummary();
  assert.ok(summary.totalConfigured > 30);
  assert.equal(summary.byFamily.commonwealthShared, 44);
  assert.equal(summary.byFamily.warwickSharedCourses, 7);
});
