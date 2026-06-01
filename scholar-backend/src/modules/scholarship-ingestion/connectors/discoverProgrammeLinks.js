const axios = require("axios");

const REQUEST_HEADERS = {
  "User-Agent":
    "ScholarPlatformBot/1.0 (+https://localhost; scholarship ingestion public data)",
  Accept: "text/html,application/xhtml+xml",
};

const DEFAULT_EXCLUDE = [
  /\/feed\/?$/i,
  /\/wp-json/i,
  /\/page\/\d+/i,
  /\/archive/i,
  /\/tag\//i,
  /\/category\//i,
  /\/author\//i,
  /\/news\//i,
  /\/blog\//i,
  /\/press\//i,
  /\/privacy/i,
  /\/contact/i,
  /\/about\/?$/i,
  /\.pdf$/i,
  /\/wp-content\//i,
  /\/wp-includes\//i,
  /xmlrpc\.php/i,
  /fonts\.googleapis/i,
  /\.(css|js|woff2?|ttf|eot|ico|jpe?g|png|gif|svg)(\?|$)/i,
  /toto|casino|slot|bandar|togel|betting|macau/i,
];

function toAbsoluteUrl(href, baseUrl) {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function slugToTitle(slug) {
  return String(slug || "")
    .split(/[-_/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function isProgrammeLikeUrl(url, options = {}) {
  const hay = String(url || "").toLowerCase();
  const exclude = [...DEFAULT_EXCLUDE, ...(options.excludePatterns || [])];
  if (exclude.some((re) => re.test(hay))) return false;

  if (options.pathMustInclude) {
    const needles = Array.isArray(options.pathMustInclude)
      ? options.pathMustInclude
      : [options.pathMustInclude];
    if (!needles.some((n) => hay.includes(String(n).toLowerCase()))) return false;
  }

  if (options.urlPattern && !options.urlPattern.test(hay)) return false;

  return (
    hay.includes("scholarship") ||
    hay.includes("fellowship") ||
    hay.includes("award") ||
    hay.includes("bursary") ||
    hay.includes("grant") ||
    hay.includes("stipend") ||
    options.relaxMatch === true
  );
}

async function fetchHubHtml(hubUrl, timeout = 30000, headers = REQUEST_HEADERS) {
  const response = await axios.get(hubUrl, {
    timeout,
    headers: { ...REQUEST_HEADERS, ...headers },
    maxRedirects: 5,
  });
  return String(response.data || "");
}

/**
 * Discover programme-level links from an official scholarships hub page.
 */
async function discoverProgrammeLinks(hubUrl, options = {}) {
  const {
    max = 12,
    hostMustInclude = null,
    pathPrefix = null,
    pathMustInclude = null,
    urlPattern = null,
    extraUrls = [],
    excludePatterns = [],
    relaxMatch = false,
    timeout = 30000,
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

  const matchOpts = { pathMustInclude, urlPattern, excludePatterns, relaxMatch };

  for (const href of hrefs) {
    const abs = toAbsoluteUrl(href, hubUrl);
    if (!abs || seen.has(abs)) continue;
    const host = new URL(abs).hostname.replace(/^www\./, "");
    if (hostMustInclude && !host.includes(hostMustInclude) && host !== baseHost) continue;
    if (pathPrefix && !abs.includes(pathPrefix)) continue;
    if (!isProgrammeLikeUrl(abs, matchOpts)) continue;
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

  return links;
}

module.exports = {
  discoverProgrammeLinks,
  slugToTitle,
  fetchHubHtml,
  isProgrammeLikeUrl,
};
