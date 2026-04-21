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
