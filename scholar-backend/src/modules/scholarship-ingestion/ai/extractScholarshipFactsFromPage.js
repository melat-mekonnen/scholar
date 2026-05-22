const { extractScholarshipFacts } = require("./extractScholarshipFacts");
const {
  fetchOfficialPageMetadataWithRetry,
} = require("../connectors/fetchOfficialPageMetadata");

function mergeUniqueLinks(existing, next) {
  const seen = new Set();
  const out = [];
  for (const url of [...(existing || []), ...(next || [])]) {
    const key = String(url || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function mergePageIntoFacts(baseFacts, pageMeta, fetchUrl) {
  const merged = {
    ...baseFacts,
    fetchedFromUrl: fetchUrl,
    pageFetchStatus: pageMeta?.descriptionFromSite ? "ok" : pageMeta?.description ? "partial" : "empty",
  };

  if (pageMeta?.deadline && !merged.deadline) {
    merged.deadline = pageMeta.deadline;
  }
  if (pageMeta?.fundingType && !merged.fundingType) {
    merged.fundingType = pageMeta.fundingType;
  }

  const pageText = String(pageMeta?.description || "").trim();
  if (pageText.length >= 80) {
    merged.pageExcerpt = pageText.slice(0, 1800);
    merged.rawExcerpt = [merged.rawExcerpt, merged.pageExcerpt].filter(Boolean).join("\n\n").slice(0, 2400);
  }

  merged.officialLinks = mergeUniqueLinks(merged.officialLinks, [fetchUrl, pageMeta?.applicationUrl]);
  merged.extractedAt = new Date().toISOString();
  return merged;
}

/**
 * Build facts JSON from DB record, optionally enriching from the official leaf page HTML.
 */
async function extractScholarshipFactsFromPage(record, { fetchPage = true } = {}) {
  const baseFacts = extractScholarshipFacts(record);
  if (!fetchPage) return baseFacts;

  const fetchUrl = record.applicationUrl || record.sourceUrl;
  if (!fetchUrl) {
    return { ...baseFacts, pageFetchStatus: "skipped_no_url" };
  }

  try {
    const pageMeta = await fetchOfficialPageMetadataWithRetry(fetchUrl, {
      retries: 1,
      timeout: 28000,
      baseDelayMs: 600,
    });
    return mergePageIntoFacts(baseFacts, pageMeta, fetchUrl);
  } catch (err) {
    return {
      ...baseFacts,
      fetchedFromUrl: fetchUrl,
      pageFetchStatus: "failed",
      pageFetchError: String(err.message || err).slice(0, 180),
    };
  }
}

module.exports = {
  extractScholarshipFactsFromPage,
  mergePageIntoFacts,
};
