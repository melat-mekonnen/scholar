const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveApplicationDates,
  formatDateHumanReadable,
  extractOpenDate,
  extractCloseDate,
  extractProgrammeStartDate,
} = require("../src/utils/resolveApplicationDates");

test("extractOpenDate and extractCloseDate parse labeled lines", () => {
  const text =
    "Applications open on September 1, 2025. Application closes: December 15, 2025.";
  assert.equal(extractOpenDate(text), "2025-09-01");
  assert.equal(extractCloseDate(text), "2025-12-15");
});

test("extractProgrammeStartDate reads starts ISO from overview", () => {
  const text =
    "BSc Accounting and Finance at University of Warwick (undergraduate, starts 2027-09-27).";
  assert.equal(extractProgrammeStartDate(text), "2027-09-27");
});

test("resolveApplicationDates infers study programme application window", () => {
  const resolved = resolveApplicationDates({
    recordType: "study_programme",
    degreeLevel: "bachelor",
    description:
      "BSc Economics at University of Warwick (undergraduate, starts 2027-09-27).",
  });
  assert.equal(resolved.applicationStartDate, "2026-09-27");
  assert.equal(resolved.applicationEndDate, "2027-01-27");
  assert.equal(resolved.isRolling, false);
});

test("resolveApplicationDates applies known Commonwealth Shared cycle", () => {
  const resolved = resolveApplicationDates({
    title: "Commonwealth Shared Scholarship — Bangor University (8 awards)",
    description:
      "Commonwealth Shared Scholarship at Bangor University for the 2026/27 academic year.",
  });
  assert.equal(resolved.applicationStartDate, "2025-11-13");
  assert.equal(resolved.applicationEndDate, "2025-12-09");
});

test("formatDateHumanReadable renders long month names", () => {
  assert.equal(formatDateHumanReadable("2026-05-31"), "May 31, 2026");
});

test("resolveApplicationDates clears rolling when close date is present", () => {
  const resolved = resolveApplicationDates({
    isRolling: true,
    deadline: "2026-06-01",
    description: "Rolling applications accepted.",
  });
  assert.equal(resolved.isRolling, false);
  assert.equal(resolved.applicationEndDate, "2026-06-01");
});
