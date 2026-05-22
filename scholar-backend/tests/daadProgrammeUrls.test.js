const test = require("node:test");
const assert = require("node:assert/strict");
const { DAAD_PROGRAMME_URL_BY_EXTERNAL_ID } = require("../src/modules/scholarship-ingestion/connectors/daadProgrammeUrls");
const { auditCuratedApplyRecord } = require("../src/modules/scholarship-ingestion/leafProgrammes/leafApplyUrl");

test("DAAD programme URLs use stable scholarship database detail pages", () => {
  for (const [externalId, url] of Object.entries(DAAD_PROGRAMME_URL_BY_EXTERNAL_ID)) {
    assert.match(url, /www2\.daad\.de\/deutschland\/stipendium\/datenbank\/en\/21148-scholarship-database\/\?detail=\d+/);
    const issues = auditCuratedApplyRecord({
      externalId,
      title: externalId,
      applicationUrl: url,
      sourceUrl: url,
    });
    assert.equal(issues.length, 0, `${externalId} should pass apply URL audit: ${issues.join(", ")}`);
  }
});

test("legacy DAAD hub paths are not used in curated map", () => {
  for (const url of Object.values(DAAD_PROGRAMME_URL_BY_EXTERNAL_ID)) {
    assert.doesNotMatch(url, /\/daad-scholarships\//);
  }
});
