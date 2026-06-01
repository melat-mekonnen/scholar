const test = require("node:test");
const assert = require("node:assert/strict");
const {
  leafProgrammeDefinitions,
  SCRAPE_PROGRAMME_DEFINITIONS,
  catalogSummary,
} = require("../src/modules/scholarship-ingestion/leafProgrammes/assembleLeafCatalog");
const { buildLeafRecordsFromList } = require("../src/modules/scholarship-ingestion/leafProgrammes/buildLeafProgrammeRecord");

test("curated leaf catalog includes scrape + leaf programme definitions", () => {
  const leaf = leafProgrammeDefinitions();
  const scrape = SCRAPE_PROGRAMME_DEFINITIONS;
  assert.ok(leaf.length >= 150);
  assert.ok(scrape.length >= 20);
  const urls = new Set(
    [...leaf, ...scrape].map((p) => String(p.url || p.applicationUrl || p.sourceUrl).replace(/\/+$/, "")),
  );
  assert.ok(urls.size >= 150);
});

test("leaf catalog summary meets production minimum", () => {
  const summary = catalogSummary();
  assert.ok(summary.totalConfigured >= 300);
  assert.equal(summary.byFamily.commonwealthShared, 44);
  assert.equal(summary.byFamily.warwickSharedCourses, 7);
  assert.ok(summary.byFamily.sharedUniversityCourses >= 150);
});

test("buildLeafRecordsFromList produces valid apply URLs", () => {
  const records = buildLeafRecordsFromList(leafProgrammeDefinitions().slice(0, 3));
  assert.equal(records.length, 3);
  for (const record of records) {
    assert.ok(record.applicationUrl);
    assert.ok(record.sourceUrl);
  }
});
