const test = require("node:test");
const assert = require("node:assert/strict");
const { mergePublicSearchResults } = require("../../src/utils/mergePublicSearchResults");

test("mergePublicSearchResults sorts by deadline ascending", () => {
  const rows = [
    { title: "Zebra", deadline: "2026-12-01" },
    { title: "Alpha", deadline: "2026-06-01" },
    { title: "Beta", deadline: "2026-09-01" },
  ];
  const merged = mergePublicSearchResults(rows, [], {
    sort: "deadline_asc",
    limit: 10,
  });
  assert.deepEqual(
    merged.map((r) => r.deadline),
    ["2026-06-01", "2026-09-01", "2026-12-01"],
  );
});

test("mergePublicSearchResults prioritizes title matches for relevance", () => {
  const rows = [
    { title: "Other grant", deadline: "2026-01-01", createdAt: "2026-01-01" },
    { title: "Warwick engineering scholarship", deadline: "2026-12-01", createdAt: "2025-01-01" },
  ];
  const merged = mergePublicSearchResults(rows, [], {
    sort: "relevance",
    q: "warwick",
    limit: 10,
  });
  assert.match(merged[0].title, /Warwick/i);
});
