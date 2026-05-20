const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseEligibleRegions,
  isOpenToAfricanStudents,
  africaSourceBoostScore,
} = require("../src/modules/scholarship-ingestion/africaEligibility");

test("parseEligibleRegions auto-tags africa from Ethiopian ministry domain", () => {
  const regions = parseEligibleRegions("Graduate funding programme", "https://www.moe.gov.et/en/scholarships");
  assert.ok(regions.includes("africa"));
});

test("parseEligibleRegions tags africa from text mentioning Ethiopia", () => {
  const regions = parseEligibleRegions("Open to Ethiopian nationals pursuing master's study abroad");
  assert.ok(regions.includes("africa"));
});

test("isOpenToAfricanStudents returns true for African aggregator source", () => {
  assert.equal(
    isOpenToAfricanStudents("Latest opportunities", "https://www.afterschoolafrica.com/scholarships/example"),
    true,
  );
});

test("africaSourceBoostScore returns boost for African university domain", () => {
  assert.equal(africaSourceBoostScore("https://www.uonbi.ac.ke/funding/scholarships"), 8);
  assert.equal(africaSourceBoostScore("https://www.chevening.org/apply/"), 0);
});
