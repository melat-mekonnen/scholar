const {
  hostnameFromUrl,
  isAggregatorUrl,
  isGovTrustedUrl,
} = require("../govTrustedDomains");

const SKIP_HOST_SUFFIXES = [
  "facebook.com",
  "twitter.com",
  "x.com",
  "instagram.com",
  "pinterest.com",
  "linkedin.com",
  "youtube.com",
  "t.me",
  "whatsapp.com",
  "reddit.com",
  "tiktok.com",
  "medium.com",
  "bit.ly",
  "goo.gl",
  "t.co",
];

const MIN_OFFICIAL_SCORE = 40;

const OFFICIAL_PATH_SIGNALS =
  /scholarship|fellowship|financial-aid|funding|grant|bursar|award|stipend|apply|admissions\/aid/i;

function toAbsoluteUrl(href, baseUrl) {
  try {
    const abs = new URL(href, baseUrl).toString();
    if (!/^https?:\/\//i.test(abs)) return null;
    return abs;
  } catch {
    return null;
  }
}

function normalizeCompareUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.toString().replace(/\/+$/, "").toLowerCase();
  } catch {
    return String(url || "").replace(/\/+$/, "").toLowerCase();
  }
}

function shouldSkipOutboundUrl(url, articleUrl) {
  const hay = String(url || "").toLowerCase();
  if (!hay.startsWith("http")) return true;
  if (/^(mailto:|tel:|javascript:|#)/i.test(hay)) return true;
  if (isAggregatorUrl(url)) return true;

  const host = hostnameFromUrl(url);
  if (!host) return true;
  if (SKIP_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`))) {
    return true;
  }

  if (articleUrl && normalizeCompareUrl(url) === normalizeCompareUrl(articleUrl)) {
    return true;
  }

  return false;
}

function scoreOfficialCandidate(url, linkText = "") {
  if (shouldSkipOutboundUrl(url)) return -1;

  let score = 0;
  const host = hostnameFromUrl(url);
  const text = String(linkText || "").toLowerCase();

  if (isGovTrustedUrl(url)) {
    score += 100;
  } else if (host.endsWith(".gov") || host.endsWith(".gov.uk")) {
    score += 90;
  } else if (host.endsWith(".edu") || host.endsWith(".ac.uk")) {
    score += 80;
  } else if (host.endsWith(".org")) {
    score += 40;
  } else {
    score += 10;
  }

  if (/\b(apply|official|website|learn more|visit site|programme page|program page)\b/i.test(text)) {
    score += 12;
  }
  if (/\b(university|college|foundation|institute|fellowship|scholarship program)\b/i.test(url)) {
    score += 5;
  }
  if (/\/apply\b/i.test(url)) {
    score += 8;
  }

  const pathHay = String(url || "").toLowerCase();
  const hasProgrammePath = OFFICIAL_PATH_SIGNALS.test(pathHay);
  if (!isGovTrustedUrl(url) && (host.endsWith(".edu") || host.endsWith(".ac.uk") || host.endsWith(".org"))) {
    if (!hasProgrammePath) {
      score -= 35;
    } else {
      score += 10;
    }
  }

  return score;
}

function extractAnchorLinks(html, baseUrl) {
  const links = [];
  const seen = new Set();
  const anchorRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of String(html || "").matchAll(anchorRe)) {
    const abs = toAbsoluteUrl(match[1], baseUrl);
    if (!abs || seen.has(abs)) continue;
    seen.add(abs);
    const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    links.push({ url: abs, text });
  }

  for (const match of String(html || "").matchAll(/href=["']([^"']+)["']/gi)) {
    const abs = toAbsoluteUrl(match[1], baseUrl);
    if (!abs || seen.has(abs)) continue;
    seen.add(abs);
    links.push({ url: abs, text: "" });
  }

  return links;
}

/**
 * Pick the best outbound official programme URL from aggregator article HTML.
 * Returns null when no link clears the minimum score threshold.
 */
function resolveOfficialProgrammeUrl(html, articleUrl, options = {}) {
  const minScore = options.minScore ?? MIN_OFFICIAL_SCORE;
  const links = extractAnchorLinks(html, articleUrl);

  let best = null;
  for (const link of links) {
    if (shouldSkipOutboundUrl(link.url, articleUrl)) continue;
    const score = scoreOfficialCandidate(link.url, link.text);
    if (score < minScore) continue;
    if (!best || score > best.score) {
      best = {
        url: link.url,
        score,
        linkText: link.text || null,
      };
    }
  }

  return best;
}

module.exports = {
  MIN_OFFICIAL_SCORE,
  resolveOfficialProgrammeUrl,
  scoreOfficialCandidate,
  shouldSkipOutboundUrl,
  extractAnchorLinks,
};
