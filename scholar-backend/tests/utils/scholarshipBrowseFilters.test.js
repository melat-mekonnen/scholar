const test = require("node:test");
const assert = require("node:assert/strict");
const {
  classifyCountryToRegion,
  classifyFieldToCategory,
  expandRegionsToCountries,
  expandFieldCategoriesToFields,
  buildRegionFilterOptions,
  buildFieldCategoryFilterOptions,
} = require("../../src/utils/scholarshipBrowseFilters");

test("classifies countries into browse regions", () => {
  assert.equal(classifyCountryToRegion("Ethiopia"), "africa");
  assert.equal(classifyCountryToRegion("United Kingdom"), "europe");
  assert.equal(classifyCountryToRegion("European Union"), "europe");
  assert.equal(classifyCountryToRegion("Asia and the Pacific"), "asia_pacific");
  assert.equal(classifyCountryToRegion("Africa (multiple countries)"), "africa");
});

test("classifies fields into student-friendly categories", () => {
  assert.equal(classifyFieldToCategory("multiple disciplines"), "general");
  assert.equal(classifyFieldToCategory("business"), "business");
  assert.equal(
    classifyFieldToCategory("improving population health, health systems and capacity"),
    "health",
  );
});

test("expands region selection to underlying country values", () => {
  const all = ["Ethiopia", "United Kingdom", "United States", "Asia and the Pacific"];
  const expanded = expandRegionsToCountries(["africa"], all);
  assert.deepEqual(expanded, ["Ethiopia"]);
});

test("expands field categories to raw DB field values", () => {
  const all = ["multiple disciplines", "business", "doctoral research"];
  const expanded = expandFieldCategoriesToFields(["business", "general"], all);
  assert.ok(expanded.includes("business"));
  assert.ok(expanded.includes("multiple disciplines"));
  assert.equal(expanded.includes("doctoral research"), false);
});

test("buildRegionFilterOptions aggregates scholarship counts", () => {
  const options = buildRegionFilterOptions([
    { country: "Ethiopia", count: 10 },
    { country: "Kenya", count: 7 },
    { country: "United Kingdom", count: 100 },
  ]);
  const africa = options.find((o) => o.id === "africa");
  assert.ok(africa);
  assert.equal(africa.count, 17);
});
