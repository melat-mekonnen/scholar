const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  mapSeedToImportRecord,
  fetchMastersPortalScholarships,
} = require("../src/modules/scholarship-ingestion/connectors/mastersPortalConnector");
const { loadMastersPortalSeedFile } = require("../src/modules/scholarship-ingestion/connectors/loadMastersPortalSeeds");

test("MastersPortal seeds load from data file", () => {
  const { scholarships, discoverySearchUrl } = loadMastersPortalSeedFile();
  assert.ok(scholarships.length >= 2);
  assert.match(discoverySearchUrl || "", /addis-ababa-university/i);
});

test("MastersPortal seeds use official apply URLs not listing search pages", async () => {
  const records = await fetchMastersPortalScholarships();
  for (const record of records) {
    assert.ok(record.applicationUrl);
    assert.doesNotMatch(record.applicationUrl, /mastersportal\.com\/search\//i);
    assert.doesNotMatch(record.applicationUrl, /foreign-study-programs/i);
  }
  const studyportals = records.find((r) => r.externalId === "mastersportal-studyportals-scholarship");
  assert.match(studyportals.applicationUrl, /typeform\.com/i);
});

test("mapSeedToImportRecord rejects short descriptions", () => {
  const record = mapSeedToImportRecord({
    externalId: "x",
    title: "Test",
    organizationName: "Org",
    country: "Ethiopia",
    applicationUrl: "https://example.com/apply",
    sourceUrl: "https://www.mastersportal.com/scholarships/test/",
    description: "Too short",
  });
  assert.equal(record, null);
});
