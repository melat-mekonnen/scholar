const test = require("node:test");
const assert = require("node:assert/strict");
const { assessQualityGate } = require("../src/modules/scholarship-ingestion/qualityGate");

const baseGov = {
  title: "Chevening Scholarships for Master's Study",
  country: "United Kingdom",
  degreeLevel: "master",
  fundingType: "fully_funded",
  deadline: "2026-11-15",
  applicationUrl: "https://www.chevening.org/apply/",
  sourceUrl: "https://www.chevening.org/scholarships/chevening-scholarships/",
  description:
    "UK government-funded scholarships for international students from eligible countries to pursue a one-year master's degree in the UK. Covers tuition, monthly stipend, travel, and visa costs. Open to talented professionals with leadership potential from Africa, Asia, and the Commonwealth.",
};

test("assessQualityGate auto-verifies trusted government record", () => {
  const gate = assessQualityGate(baseGov);
  assert.equal(gate.tier, "government_trusted");
  assert.equal(gate.publishStatus, "verified");
  assert.equal(gate.pass, true);
  assert.ok(gate.eligibleRegions.includes("africa"));
});

test("assessQualityGate boosts score for African source domain", () => {
  const baseScore = assessQualityGate(baseGov).score;
  const africanScore = assessQualityGate({
    ...baseGov,
    sourceUrl: "https://education.gov.ng/federal-scholarships-board/",
    applicationUrl: "https://education.gov.ng/federal-scholarships-board/",
  }).score;
  assert.ok(africanScore > baseScore);
});

test("assessQualityGate keeps aggregator pending", () => {
  const gate = assessQualityGate({
    ...baseGov,
    applicationUrl: "https://www.fastweb.com/college-scholarships/scholarships/12345-example",
    sourceUrl: "https://www.fastweb.com/college-scholarships/scholarships/12345-example",
    description: `${baseGov.description} `.repeat(3),
  });
  assert.equal(gate.tier, "aggregator");
  assert.equal(gate.publishStatus, "pending");
  assert.equal(gate.pass, false);
});

test("assessQualityGate accepts rolling programmes without deadline", () => {
  const gate = assessQualityGate({
    ...baseGov,
    deadline: null,
    description: `${baseGov.description} Applications are accepted on a rolling basis throughout the year.`,
  });
  assert.equal(gate.isRolling, true);
  assert.equal(gate.publishStatus, "verified");
});

test("assessQualityGate treats gov programmes without deadline as open rolling", () => {
  const gate = assessQualityGate({
    ...baseGov,
    deadline: null,
    degreeLevel: null,
    description: baseGov.description,
  });
  assert.equal(gate.isRolling, true);
  assert.equal(gate.publishStatus, "verified");
});
