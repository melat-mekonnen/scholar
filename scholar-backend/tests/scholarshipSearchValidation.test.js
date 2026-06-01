const test = require("node:test");
const assert = require("node:assert/strict");
const { validateSearchInputs } = require("../src/usecases/scholarships/searchValidation");

test("validateSearchInputs accepts valid search payload", () => {
  assert.doesNotThrow(() =>
    validateSearchInputs({
      sort: "relevance",
      degreeLevels: ["bachelor", "master"],
      fundingTypes: ["fully_funded"],
      deadlineFrom: "2026-01-01",
      deadlineTo: "2026-12-31",
      status: "verified",
      isPrivileged: false,
    })
  );
});

test("validateSearchInputs rejects invalid sort", () => {
  assert.throws(
    () =>
      validateSearchInputs({
        sort: "oldest",
        degreeLevels: [],
        fundingTypes: [],
        deadlineFrom: "",
        deadlineTo: "",
        status: "verified",
        isPrivileged: false,
      }),
    /Invalid sort value/
  );
});

test("validateSearchInputs rejects invalid funding type", () => {
  assert.throws(
    () =>
      validateSearchInputs({
        sort: "recent",
        degreeLevels: ["bachelor"],
        fundingTypes: ["full"],
        deadlineFrom: "",
        deadlineTo: "",
        status: "verified",
        isPrivileged: false,
      }),
    /Invalid funding_type filter value/
  );
});

test("validateSearchInputs rejects invalid date range", () => {
  assert.throws(
    () =>
      validateSearchInputs({
        sort: "deadline_asc",
        degreeLevels: [],
        fundingTypes: [],
        deadlineFrom: "2026-12-31",
        deadlineTo: "2026-01-01",
        status: "verified",
        isPrivileged: false,
      }),
    /Invalid date range/
  );
});

test("validateSearchInputs rejects non-privileged non-verified status", () => {
  assert.throws(
    () =>
      validateSearchInputs({
        sort: "relevance",
        degreeLevels: [],
        fundingTypes: [],
        deadlineFrom: "",
        deadlineTo: "",
        status: "pending",
        isPrivileged: false,
      }),
    /Only verified status is allowed/
  );
});

test("validateSearchInputs rejects invalid application filter", () => {
  assert.throws(
    () =>
      validateSearchInputs({
        sort: "relevance",
        degreeLevels: [],
        fundingTypes: [],
        deadlineFrom: "",
        deadlineTo: "",
        status: "verified",
        applicationFilter: "maybe",
        isPrivileged: false,
      }),
    /Invalid application_filter value/
  );
});

const { comparePublicOpportunities } = require("../src/utils/mapPublicOpportunity");

test("comparePublicOpportunities respects deadline sort across record types", () => {
  const rows = [
    { title: "Z Programme", deadline: "2026-12-01", recordType: "study_programme" },
    { title: "A Scholarship", deadline: "2026-06-01", recordType: "scholarship" },
  ].sort((a, b) => comparePublicOpportunities(a, b, "deadline_asc"));

  assert.equal(rows[0].title, "A Scholarship");
  assert.equal(rows[1].title, "Z Programme");
});

test("comparePublicOpportunities prioritizes title matches when sorting by relevance", () => {
  const rows = [
    { id: "b", title: "Other award", createdAt: "2026-01-02T00:00:00.000Z" },
    { id: "a", title: "Engineering grant", createdAt: "2026-01-01T00:00:00.000Z" },
  ].sort((a, b) => comparePublicOpportunities(a, b, "relevance", "engineering"));

  assert.equal(rows[0].title, "Engineering grant");
});

test("comparePublicOpportunities shuffles browse results when no query is present", () => {
  const rows = [
    { id: "1", title: "Commonwealth Shared Scholarship", qualityScore: 99 },
    { id: "2", title: "DAAD EPOS Programme", qualityScore: 80 },
    { id: "3", title: "Chevening Scholarships", qualityScore: 95 },
  ].sort((a, b) => comparePublicOpportunities(a, b, "relevance", "", "session-test-seed"));

  assert.equal(rows[0].title, "DAAD EPOS Programme");
  assert.equal(rows[2].title, "Commonwealth Shared Scholarship");
});

test("validateSearchInputs rejects invalid availability filter", () => {
  assert.throws(
    () =>
      validateSearchInputs({
        sort: "relevance",
        degreeLevels: [],
        fundingTypes: [],
        eligibleRegions: [],
        availability: "soon",
        deadlineFrom: "",
        deadlineTo: "",
        status: "verified",
        isPrivileged: false,
      }),
    /Invalid availability filter value/
  );
});

test("validateSearchInputs rejects invalid eligible region", () => {
  assert.throws(
    () =>
      validateSearchInputs({
        sort: "relevance",
        degreeLevels: [],
        fundingTypes: [],
        eligibleRegions: ["Africa!"],
        availability: "",
        deadlineFrom: "",
        deadlineTo: "",
        status: "verified",
        isPrivileged: false,
      }),
    /Invalid eligible_region filter value/
  );
});
