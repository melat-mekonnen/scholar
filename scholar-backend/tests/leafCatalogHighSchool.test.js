const test = require("node:test");
const assert = require("node:assert/strict");
const { buildLeafRecordsFromList } = require("../src/modules/scholarship-ingestion/leafProgrammes/buildLeafProgrammeRecord");
const {
  highSchoolInternationalLeafProgrammes,
  HIGH_SCHOOL_LEAF_PROGRAMMES,
} = require("../src/modules/scholarship-ingestion/leafProgrammes/highSchoolInternationalProgrammes");
const { catalogSummary } = require("../src/modules/scholarship-ingestion/leafProgrammes/assembleLeafCatalog");

test("high school leaf programmes are verified apply URLs with high_school degree", () => {
  const records = highSchoolInternationalLeafProgrammes();
  assert.equal(records.length, HIGH_SCHOOL_LEAF_PROGRAMMES.length);
  for (const r of records) {
    assert.equal(r.degreeLevel, "high_school");
    assert.ok(r.applicationUrl.startsWith("https://"));
    assert.ok(r.description.length >= 120);
    assert.notEqual(r.applicationUrl, "https://www.assist.org/");
  }
  const titles = records.map((r) => r.title);
  assert.ok(titles.some((t) => t.includes("ASSIST")));
  assert.ok(titles.some((t) => t.includes("UWC")));
  assert.ok(titles.some((t) => t.includes("YES")));
});

test("catalog summary includes high school international family", () => {
  const summary = catalogSummary();
  assert.ok(summary.byFamily.highSchoolInternational >= 8);
});
