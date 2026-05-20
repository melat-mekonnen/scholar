const { discoverProgrammeLinks, fetchHubHtml, isProgrammeLikeUrl } = require("./discoverProgrammeLinks");

const LISTING_KEYWORDS = [
  "scholarship",
  "fellowship",
  "grant",
  "opportunity",
  "award",
  "bursary",
  "internship",
  "funding",
  "programme",
  "program",
];

const ARTICLE_PATH = [
  /\/\d{4}\/\d{2}\//,
  /\/\d{4}\/\d{1,2}\//,
  /\/\d{4}\/[^/]+\/?$/,
  /\/post\//i,
  /\/article\//i,
  /\/opportunities?\//i,
];

function toAbsoluteUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function isListingArticleUrl(url, options = {}) {
  const hay = String(url || "").toLowerCase();
  if (!hay.startsWith("http")) return false;

  if (isProgrammeLikeUrl(url, { ...options, relaxMatch: true })) return true;

  const hasKeyword = LISTING_KEYWORDS.some((kw) => hay.includes(kw));
  const looksLikeArticle = ARTICLE_PATH.some((re) => re.test(hay));
  if (hasKeyword && looksLikeArticle) return true;

  if (options.relaxMatch && hasKeyword && hay.split("/").length >= 5) return true;

  return false;
}

/**
 * Discover individual listing/article links from aggregator hub pages.
 */
async function discoverListingLinks(hubUrl, options = {}) {
  const {
    max = 20,
    extraUrls = [],
    excludePatterns = [],
    timeout = 30000,
    relaxMatch = true,
  } = options;

  let html = "";
  try {
    html = await fetchHubHtml(hubUrl, timeout);
  } catch {
    return [...new Set(extraUrls)].slice(0, max);
  }

  const baseHost = new URL(hubUrl).hostname.replace(/^www\./, "");
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const seen = new Set();
  const links = [];

  for (const href of hrefs) {
    const abs = toAbsoluteUrl(href, hubUrl);
    if (!abs || seen.has(abs)) continue;
    const host = new URL(abs).hostname.replace(/^www\./, "");
    if (host !== baseHost && !host.endsWith(`.${baseHost}`)) continue;
    if (!isListingArticleUrl(abs, { excludePatterns, relaxMatch })) continue;
    if (abs.replace(/\/+$/, "") === hubUrl.replace(/\/+$/, "")) continue;
    seen.add(abs);
    links.push(abs);
    if (links.length >= max) break;
  }

  for (const url of extraUrls) {
    if (links.length >= max) break;
    if (!seen.has(url)) {
      seen.add(url);
      links.push(url);
    }
  }

  if (links.length === 0 && extraUrls.length > 0) {
    return discoverProgrammeLinks(hubUrl, { ...options, relaxMatch: true, max });
  }

  return links;
}

module.exports = {
  discoverListingLinks,
  isListingArticleUrl,
  LISTING_KEYWORDS,
};
