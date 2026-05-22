const test = require("node:test");
const assert = require("node:assert/strict");
const {
  computeDuplicateRate,
  computeFailureRate,
  deriveHealthStatus,
  formatSourceHealthRow,
} = require("../src/modules/scholarship-ingestion/sourceHealth");

test("computeDuplicateRate calculates skipped over fetched", () => {
  assert.equal(computeDuplicateRate({ totalFetched: 100, totalSkipped: 25 }), 0.25);
  assert.equal(computeDuplicateRate({ totalFetched: 0, totalSkipped: 0 }), 0);
});

test("computeFailureRate prefers record-level failures when fetched > 0", () => {
  assert.equal(
    computeFailureRate({ totalRuns: 10, failedRuns: 1, totalFetched: 50, totalFailed: 5 }),
    0.1,
  );
});

test("deriveHealthStatus maps failure rate to degraded", () => {
  assert.equal(
    deriveHealthStatus({ lastStatus: "completed", failureRate: 0.6, lastCrawlAt: "2026-01-01" }),
    "degraded",
  );
  assert.equal(deriveHealthStatus({ lastStatus: null, failureRate: 0, lastCrawlAt: null }), "never_run");
});

test("formatSourceHealthRow shapes repository row", () => {
  const row = formatSourceHealthRow({
    source_name: "AFRICAN_UNIVERSITIES",
    last_crawl_at: "2026-05-01T00:00:00Z",
    last_status: "completed",
    last_fetched: 20,
    last_upserted: 5,
    last_failed: 2,
    last_skipped: 10,
    total_runs: 4,
    failed_runs: 0,
    total_fetched: 80,
    total_failed: 8,
    total_skipped: 30,
    last_error: null,
  });

  assert.equal(row.sourceName, "AFRICAN_UNIVERSITIES");
  assert.equal(row.duplicateRate, 0.375);
  assert.equal(row.healthStatus, "healthy");
});
