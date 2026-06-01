const test = require("node:test");
const assert = require("node:assert/strict");
const { extractScholarshipFacts } = require("../src/modules/scholarship-ingestion/ai/extractScholarshipFacts");
const {
  formatDescriptionFromFacts,
  parseDescriptionSections,
} = require("../src/modules/scholarship-ingestion/ai/formatDescriptionSections");
const { mergePageIntoFacts } = require("../src/modules/scholarship-ingestion/ai/extractScholarshipFactsFromPage");

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

test("mergePageIntoFacts enriches base facts from fetched page metadata", () => {
  const baseFacts = extractScholarshipFacts({
    title: "DAAD Scholarship",
    organizationName: "DAAD",
    country: "Germany",
    degreeLevel: "master",
    fundingType: "fully_funded",
    applicationUrl: "https://example.org/apply",
    sourceUrl: "https://example.org/programme",
    description: "Short seed description for the DAAD award.",
    isRolling: false,
  });

  const pageMeta = {
    descriptionFromSite: true,
    description:
      "This official page describes eligibility, funding, and how to apply for the DAAD scholarship programme in detail.",
    deadline: "2026-03-01",
    fundingType: "partially_funded",
    applicationUrl: "https://example.org/apply-now",
  };

  const merged = mergePageIntoFacts(baseFacts, pageMeta, "https://example.org/programme");

  assert.equal(merged.pageFetchStatus, "ok");
  assert.equal(merged.deadline, "2026-03-01");
  assert.equal(merged.fundingType, "fully_funded");
  assert.ok(merged.pageExcerpt.includes("official page describes"));
  assert.ok(merged.officialLinks.includes("https://example.org/programme"));
  assert.ok(merged.officialLinks.includes("https://example.org/apply-now"));
});
