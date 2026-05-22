const test = require("node:test");
const assert = require("node:assert/strict");
const { extractScholarshipFacts } = require("../src/modules/scholarship-ingestion/ai/extractScholarshipFacts");
const {
  formatDescriptionFromFacts,
  parseDescriptionSections,
} = require("../src/modules/scholarship-ingestion/ai/formatDescriptionSections");

test("extractScholarshipFacts captures core fields", () => {
  const facts = extractScholarshipFacts({
    title: "Chevening Scholarship — Ethiopia",
    organizationName: "Chevening",
    country: "United Kingdom",
    degreeLevel: "master",
    fieldOfStudy: "any",
    fundingType: "fully_funded",
    applicationUrl: "https://chevening.org/apply/",
    sourceUrl: "https://chevening.org/scholarship/ethiopia/",
    description:
      "Fully funded master's for Ethiopian applicants. Applications are closed for 2026/27. Apply at https://chevening.org/apply/",
    isRolling: false,
    eligibleRegions: ["africa"],
  });

  assert.equal(facts.organization, "Chevening");
  assert.equal(facts.applicationStatus, "closed");
  assert.ok(facts.officialLinks.some((u) => u.includes("chevening.org")));
});

test("formatDescriptionFromFacts produces sectioned markdown", () => {
  const facts = extractScholarshipFacts({
    title: "Test Award",
    organizationName: "Test Org",
    country: "UK",
    degreeLevel: "master",
    fundingType: "fully_funded",
    applicationUrl: "https://example.org/apply",
    sourceUrl: "https://example.org/programme",
    description: "A long enough description for the test award at example.org with eligibility details.",
    isRolling: true,
  });
  const formatted = formatDescriptionFromFacts(facts);
  assert.match(formatted, /^## Overview/m);
  assert.match(formatted, /^## How to apply/m);
  const sections = parseDescriptionSections(formatted);
  assert.ok(sections.length >= 4);
});
