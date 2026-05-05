const axios = require("axios");

const REQUEST_HEADERS = {
  "User-Agent": "ScholarPlatformBot/1.0 (+educational discovery)",
  Accept: "text/html,application/xhtml+xml",
};
const MAX_ENRICHED_RESULTS = 16;

function toAbsoluteUrl(url, baseUrl) {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return null;
  }
}

function isFastwebScholarshipDetailUrl(url) {
  return /https?:\/\/www\.fastweb\.com\/college-scholarships\/scholarships\/\d+-/i.test(String(url || ""));
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function normalizeWhitespace(text) {
  return decodeHtmlEntities(String(text || ""))
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html) {
  return normalizeWhitespace(
    String(html || "")
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]*>/g, " "),
  );
}

function extractMetaDescription(html) {
  const m = String(html || "").match(
    /<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i,
  );
  return m?.[1] ? normalizeWhitespace(m[1]) : "";
}

function extractFastwebDescription(html) {
  const text = stripTags(html);
  if (!text) return "";
  const startIdx = text.search(/\bDescription\b/i);
  if (startIdx < 0) return "";
  const after = text.slice(startIdx + "Description".length);
  const endMarkers = [
    /\bReady to apply\?\b/i,
    /\bYou Might Also Like\b/i,
    /\bLog in to Fastweb\b/i,
    /\bWhat's Trending\b/i,
  ];
  let end = after.length;
  for (const marker of endMarkers) {
    const idx = after.search(marker);
    if (idx >= 0 && idx < end) end = idx;
  }
  return after
    .slice(0, end)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

function extractDeadlineIso(text) {
  const hay = String(text || "");
  const monthPattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})\b/i;
  const m1 = hay.match(monthPattern);
  if (m1) {
    const months = {
      january: "01",
      february: "02",
      march: "03",
      april: "04",
      may: "05",
      june: "06",
      july: "07",
      august: "08",
      september: "09",
      october: "10",
      november: "11",
      december: "12",
    };
    const mm = months[String(m1[1]).toLowerCase()];
    const dd = String(Number(m1[2])).padStart(2, "0");
    const yyyy = m1[3];
    if (mm && Number(dd) >= 1 && Number(dd) <= 31) return `${yyyy}-${mm}-${dd}`;
  }

  const m2 = hay.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (m2) {
    const mm = String(Number(m2[1])).padStart(2, "0");
    const dd = String(Number(m2[2])).padStart(2, "0");
    const yyyy = m2[3];
    if (Number(mm) >= 1 && Number(mm) <= 12 && Number(dd) >= 1 && Number(dd) <= 31) {
      return `${yyyy}-${mm}-${dd}`;
    }
  }
  return null;
}

async function enrichScholarshipDetail({ title, url, sourceName }) {
  try {
    const { data } = await axios.get(url, {
      headers: REQUEST_HEADERS,
      timeout: 15000,
      maxRedirects: 5,
    });
    const html = String(data || "");
    const text = stripTags(html);
    const metaDescription = extractMetaDescription(html);
    const fastwebDescription = extractFastwebDescription(html);
    const description = (fastwebDescription || metaDescription || text || `Imported from ${sourceName}`).slice(0, 900);
    const deadline = extractDeadlineIso(`${fastwebDescription} ${metaDescription} ${text}`);
    return {
      title,
      sourceUrl: url,
      description,
      deadline,
    };
  } catch {
    return {
      title,
      sourceUrl: url,
      description: `Imported from ${sourceName}`,
      deadline: null,
    };
  }
}

function extractAnchors(html) {
  const matches = [];
  const re = /<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
  let m;
  while ((m = re.exec(html))) {
    const href = decodeHtmlEntities((m[1] || "").trim());
    const text = decodeHtmlEntities((m[2] || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
    if (!href || !text) continue;
    matches.push({ href, text, index: m.index });
  }
  return matches;
}

function filterScholarshipLike(anchors) {
  return anchors.filter(({ text, href }) => {
    const hay = `${text} ${href}`.toLowerCase();
    const cleanText = text.trim().toLowerCase();
    if (!cleanText || cleanText === "see details" || cleanText === "read more") return false;
    if (cleanText.length < 4) return false;
    if (hay.includes("/about") || hay.includes("/contact") || hay.includes("/privacy")) return false;
    return (
      hay.includes("scholarship") ||
      hay.includes("fellowship") ||
      hay.includes("grant") ||
      hay.includes("financial aid")
    );
  });
}

async function fetchSource({ sourceName, sourceUrl, country = "USA" }) {
  const { data } = await axios.get(sourceUrl, {
    headers: REQUEST_HEADERS,
    timeout: 20000,
    maxRedirects: 5,
  });
  const pageHtml = String(data || "");
  const anchors = filterScholarshipLike(extractAnchors(pageHtml));
  const seen = new Set();
  const seenTitles = new Set();
  const results = [];
  for (const a of anchors) {
    const url = toAbsoluteUrl(a.href, sourceUrl);
    if (!url || seen.has(url)) continue;
    if (!isFastwebScholarshipDetailUrl(url)) continue;
    const normalizedTitle = normalizeWhitespace(a.text).toLowerCase();
    if (seenTitles.has(normalizedTitle)) continue;
    seen.add(url);
    seenTitles.add(normalizedTitle);
    const enriched = await enrichScholarshipDetail({ title: a.text.slice(0, 200), url, sourceName });
    const description = enriched.description;
    const deadline = extractDeadlineIso(description) || enriched.deadline;
    results.push({
      title: enriched.title,
      country,
      degreeLevel: null,
      fieldOfStudy: null,
      fundingType: null,
      deadline,
      amount: null,
      description,
      sourceName,
      sourceUrl: enriched.sourceUrl,
      confidence: 0.65,
    });
    if (results.length >= MAX_ENRICHED_RESULTS) break;
  }
  return results;
}

async function fetchTrustedScholarships() {
  const sources = [
    {
      sourceName: "Fastweb Scholarships",
      sourceUrl: "https://www.fastweb.com/college-scholarships",
      country: "USA",
    },
  ];

  const out = [];
  const errors = [];
  for (const src of sources) {
    try {
      const rows = await fetchSource(src);
      out.push(...rows);
    } catch (err) {
      errors.push({
        sourceName: src.sourceName,
        sourceUrl: src.sourceUrl,
        message: String(err.message || "Failed to fetch source"),
      });
    }
  }
  return { results: out, errors };
}

module.exports = {
  fetchTrustedScholarships,
  extractAnchors,
  filterScholarshipLike,
  extractDeadlineIso,
  extractMetaDescription,
  extractFastwebDescription,
};
