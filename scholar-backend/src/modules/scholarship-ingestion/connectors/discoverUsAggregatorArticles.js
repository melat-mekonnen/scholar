const { discoverListingLinks } = require("./discoverListingLinks");
const { isExcludedUsAggregatorPath, filterUsAggregatorArticleUrls } = require("./usAggregatorArticleUrl");

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};

const SHARED_EXCLUDE = [
  /\/page\/\d+/i,
  /\/archive/i,
  /\/feed\/?$/i,
  /\/wp-content\//i,
  /\/wp-json/i,
];

function listingSeedsForSource(source) {
  const seeds = [source.hubUrl, ...(source.curated || [])].filter(Boolean);
  return [...new Set(seeds)];
}

/**
 * Crawl each listing seed page and keep only article-like URLs for US aggregators.
 */
async function discoverUsAggregatorArticles(source) {
  const maxPerSource = source.crawlOptions?.maxLinks ?? 15;
  const seeds = listingSeedsForSource(source);
  const collected = [];
  const seen = new Set();

  for (const seed of seeds) {
    // eslint-disable-next-line no-await-in-loop
    const links = await discoverListingLinks(seed, {
      max: maxPerSource,
      relaxMatch: false,
      timeout: 25000,
      headers: source.key === "scholarship_tab" ? BROWSER_HEADERS : undefined,
      excludePatterns: [...SHARED_EXCLUDE, ...(source.excludePatterns || [])],
      matchArticleUrl: (url) => !isExcludedUsAggregatorPath(url),
    }).catch(() => []);

    for (const url of filterUsAggregatorArticleUrls(links, source)) {
      if (seen.has(url)) continue;
      seen.add(url);
      collected.push(url);
      if (collected.length >= maxPerSource) break;
    }

    if (collected.length >= maxPerSource) break;
  }

  return collected;
}

module.exports = { discoverUsAggregatorArticles, listingSeedsForSource };
