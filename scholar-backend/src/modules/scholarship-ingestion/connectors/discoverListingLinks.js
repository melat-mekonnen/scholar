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

  if (typeof options.matchArticleUrl === "function" && !options.matchArticleUrl(url)) {
    return false;
  }

  if (isProgrammeLikeUrl(url, { ...options, relaxMatch: options.relaxMatch === true })) {
    return true;
  }

  const hasKeyword = LISTING_KEYWORDS.some((kw) => hay.includes(kw));
  const looksLikeArticle = ARTICLE_PATH.some((re) => re.test(hay));
  if (hasKeyword && looksLikeArticle) return true;

  if (options.relaxMatch && hasKeyword && hay.split("/").length >= 5) return true;

  // WordPress-style single slug posts: /executive-diploma-scholarships-for-women-2026-uk/
  const slug = hay.replace(/\/+$/, "").split("/").pop() || "";
  if (
    slug.length >= 20 &&
    slug.includes("-") &&
    LISTING_KEYWORDS.some((kw) => slug.includes(kw.replace(/programme/, "program")))
  ) {
    return true;
  }

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
    headers = undefined,
    matchArticleUrl = null,
  } = options;

  let html = "";
  try {
    html = await fetchHubHtml(hubUrl, timeout, headers);
  } catch {
    return [...new Set(extraUrls)].slice(0, max);
  }

  const baseHost = new URL(hubUrl).hostname.replace(/^www\./, "");
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => m[1]);
  const seen = new Set();
  const links = [];
  const articleOpts = { excludePatterns, relaxMatch, matchArticleUrl };

  for (const href of hrefs) {
    const abs = toAbsoluteUrl(href, hubUrl);
    if (!abs || seen.has(abs)) continue;
    const host = new URL(abs).hostname.replace(/^www\./, "");
    if (host !== baseHost && !host.endsWith(`.${baseHost}`)) continue;
    if (!isListingArticleUrl(abs, articleOpts)) continue;
    if (abs.replace(/\/+$/, "") === hubUrl.replace(/\/+$/, "")) continue;
    seen.add(abs);
    links.push(abs);
    if (links.length >= max) break;
  }

  for (const url of extraUrls) {
    if (links.length >= max) break;
    if (seen.has(url)) continue;
    if (matchArticleUrl && !matchArticleUrl(url)) continue;
    if (!isListingArticleUrl(url, articleOpts)) continue;
    seen.add(url);
    links.push(url);
  }

  if (links.length === 0 && extraUrls.length > 0 && relaxMatch) {
    return discoverProgrammeLinks(hubUrl, { ...options, relaxMatch: true, max });
  }

  return links;
}

module.exports = {
  discoverListingLinks,
  isListingArticleUrl,
  LISTING_KEYWORDS,
};
