const test = require("node:test");
const assert = require("node:assert/strict");
const { PHASE1_CURATED_PROGRAMMES } = require("../src/modules/scholarship-ingestion/connectors/phase1CuratedProgrammes");

test("Phase 1 curated pack has expanded leaf programme count", () => {
  assert.ok(PHASE1_CURATED_PROGRAMMES.length >= 150);
  const urls = new Set(PHASE1_CURATED_PROGRAMMES.map((p) => (p.url || p.applicationUrl || p.sourceUrl).replace(/\/+$/, "")));
  assert.ok(urls.size >= 140);
  for (const entry of PHASE1_CURATED_PROGRAMMES) {
    assert.ok(entry.externalId);
    const url = entry.url || entry.applicationUrl;
    assert.ok(url.startsWith("https://"));
    assert.ok(entry.organizationName || entry.title);
  }
});
