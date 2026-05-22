const test = require("node:test");
const assert = require("node:assert/strict");
const {
  AFRICA_SCALE_SOURCE_IDS,
  CURATED_LEAF_SOURCE_IDS,
  listSources,
  getSourceConfig,
  getSourceConfigBySourceName,
  listSourceMetadata,
  parseRequestedSources,
} = require("../src/modules/scholarship-ingestion/sourceRegistry");
const {
  SOURCE_TYPES,
  compareSourcesByPriority,
} = require("../src/modules/scholarship-ingestion/sourceTypes");

test("listSources includes new African ingestion sources", () => {
  const sources = listSources();
  assert.ok(sources.includes("african_ministries"));
  assert.ok(sources.includes("african_universities"));
  assert.ok(sources.includes("african_aggregators"));
  assert.ok(sources.includes("african_research"));
});

test("getSourceConfig assigns source types", () => {
  const ministries = getSourceConfig("african_ministries");
  const universities = getSourceConfig("african_universities");
  const aggregators = getSourceConfig("african_aggregators");

  assert.equal(ministries.sourceType, SOURCE_TYPES.GOVERNMENT);
  assert.equal(universities.sourceType, SOURCE_TYPES.UNIVERSITY);
  assert.equal(aggregators.sourceType, SOURCE_TYPES.AGGREGATOR);
});

test("compareSourcesByPriority orders government before aggregators", () => {
  const meta = listSourceMetadata();
  const gov = meta.find((m) => m.id === "african_ministries");
  const agg = meta.find((m) => m.id === "african_aggregators");
  assert.ok(compareSourcesByPriority(gov, agg) < 0);
});

test("parseRequestedSources africa alias excludes DAAD", () => {
  const keys = parseRequestedSources("africa");
  assert.deepEqual(keys, AFRICA_SCALE_SOURCE_IDS);
  assert.ok(!keys.includes("daad"));
});

test("parseRequestedSources curated_leaf alias runs curated pack only", () => {
  const keys = parseRequestedSources("curated_leaf");
  assert.deepEqual(keys, CURATED_LEAF_SOURCE_IDS);
  assert.ok(keys.includes("curated_leaf"));
  assert.ok(!keys.includes("african_aggregators"));
});

test("parseRequestedSources legacy phase1 alias still resolves", () => {
  const keys = parseRequestedSources("phase1");
  assert.deepEqual(keys, CURATED_LEAF_SOURCE_IDS);
});

test("getSourceConfigBySourceName resolves registry entry", () => {
  const config = getSourceConfigBySourceName("AFRICAN_MINISTRIES");
  assert.equal(config.sourceType, SOURCE_TYPES.GOVERNMENT);
});

test("listSourceMetadata includes priority for every source", () => {
  const meta = listSourceMetadata();
  assert.equal(meta.length, listSources().length);
  for (const entry of meta) {
    assert.ok(entry.priority >= 1 && entry.priority <= 4);
    assert.ok(entry.sourceType);
  }
});
