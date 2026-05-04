const { ScholarshipCandidateRepository } = require("../../repositories/ScholarshipCandidateRepository");
const { collectRssSignals } = require("./rssService");
const { detectScholarship, fetchAndExtractPage } = require("./extractorService");
const { scoreCandidate } = require("./scoringService");

const repo = new ScholarshipCandidateRepository();

async function processRawRssItems(limit = 50) {
  const rows = await repo.listUnprocessedRawItems(limit);
  const summary = { processed: 0, detected: 0, saved: 0, failed: 0 };

  for (const row of rows) {
    try {
      const page = await fetchAndExtractPage(row.item_url, row.item_title || "");
      const isScholarship = detectScholarship(page.text);

      if (!isScholarship) {
        await repo.markRawItemProcessed(row.id, "not_scholarship");
        summary.processed += 1;
        continue;
      }

      summary.detected += 1;
      const candidate = {
        title: page.extracted.title || row.item_title || "Scholarship opportunity",
        url: row.item_url,
        university: page.extracted.university || row.feed_name || null,
        deadline: page.extracted.deadline || null,
        description: page.extracted.textSample || page.text.slice(0, 1500),
        extractedData: {
          funding: page.extracted.funding || null,
          eligibility: page.extracted.eligibility || null,
          sourceFeed: row.feed_name || null,
          publishedAt: row.published_at || null,
        },
      };
      const score = scoreCandidate(candidate);

      await repo.insertCandidate({
        ...candidate,
        score,
      });
      await repo.markRawItemProcessed(row.id);
      summary.processed += 1;
      summary.saved += 1;
    } catch (err) {
      await repo.markRawItemProcessed(row.id, String(err.message || "processing_failed").slice(0, 300));
      summary.processed += 1;
      summary.failed += 1;
      // eslint-disable-next-line no-console
      console.error(`Candidate processing failed for ${row.item_url}:`, err.message || err);
    }
  }

  return summary;
}

async function runCandidateDiscoveryCycle({ limit = 50 } = {}) {
  const rss = await collectRssSignals();
  const processing = await processRawRssItems(limit);
  return { rss, processing };
}

module.exports = { runCandidateDiscoveryCycle };

