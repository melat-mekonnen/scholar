/**
 * Pure helpers for ingestion source health metrics.
 */
function computeDuplicateRate({ totalFetched = 0, totalSkipped = 0 } = {}) {
  if (!totalFetched) return 0;
  return Math.round((totalSkipped / totalFetched) * 1000) / 1000;
}

function computeFailureRate({ totalRuns = 0, failedRuns = 0, totalFetched = 0, totalFailed = 0 } = {}) {
  if (totalFetched > 0) {
    return Math.round((totalFailed / totalFetched) * 1000) / 1000;
  }
  if (!totalRuns) return 0;
  return Math.round((failedRuns / totalRuns) * 1000) / 1000;
}

function deriveHealthStatus({ lastStatus, failureRate, lastCrawlAt }) {
  if (!lastCrawlAt) return "never_run";
  if (lastStatus === "failed") return "failed";
  if (failureRate >= 0.5) return "degraded";
  if (failureRate >= 0.2) return "warning";
  return "healthy";
}

function formatSourceHealthRow(row) {
  const duplicateRate = computeDuplicateRate({
    totalFetched: Number(row.total_fetched || 0),
    totalSkipped: Number(row.total_skipped || 0),
  });
  const failureRate = computeFailureRate({
    totalRuns: Number(row.total_runs || 0),
    failedRuns: Number(row.failed_runs || 0),
    totalFetched: Number(row.total_fetched || 0),
    totalFailed: Number(row.total_failed || 0),
  });

  return {
    sourceName: row.source_name,
    lastCrawlAt: row.last_crawl_at || null,
    lastStatus: row.last_status || null,
    lastNewScholarships: Number(row.last_upserted || 0),
    lastFetched: Number(row.last_fetched || 0),
    lastFailed: Number(row.last_failed || 0),
    lastSkipped: Number(row.last_skipped || 0),
    totalRuns: Number(row.total_runs || 0),
    failedRuns: Number(row.failed_runs || 0),
    duplicateRate,
    failureRate,
    healthStatus: deriveHealthStatus({
      lastStatus: row.last_status,
      failureRate,
      lastCrawlAt: row.last_crawl_at,
    }),
    lastError: row.last_error || null,
  };
}

module.exports = {
  computeDuplicateRate,
  computeFailureRate,
  deriveHealthStatus,
  formatSourceHealthRow,
};
