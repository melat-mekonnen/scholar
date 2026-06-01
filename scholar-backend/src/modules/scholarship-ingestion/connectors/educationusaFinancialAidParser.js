const crypto = require("crypto");
const axios = require("axios");
const { decodeHtmlEntities, cleanText } = require("./enrichPageFromHtml");
const { resolveApplicationDates } = require("../../../utils/resolveApplicationDates");

const BASE_URL = "https://educationusa.state.gov";
const HUB_URL = `${BASE_URL}/find-financial-aid`;

const REQUEST_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const DEGREE_LEVEL_FILTERS = [
  { tid: "All", label: "All degree levels" },
  { tid: "15", label: "Undergraduate - Associate's" },
  { tid: "16", label: "Undergraduate - Bachelor's" },
  { tid: "17", label: "Graduate - Master's" },
  { tid: "18", label: "Graduate - Doctorate" },
  { tid: "19", label: "Graduate - Post Doctorate" },
];

function stripTags(value) {
  return cleanText(String(value || "").replace(/<[^>]+>/g, " "));
}

function toAbsoluteUrl(pathOrUrl) {
  try {
    return new URL(pathOrUrl, BASE_URL).toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function buildFilterUrl(filters = {}, page = 0) {
  const params = new URLSearchParams({
    field_scholarship_degree_levels_tid: filters.degreeTid ?? "All",
    field_us_state_territory_tid: filters.usStateTid ?? "All",
    field_country_target_id: filters.countryTargetId ?? "",
  });
  if (page > 0) params.set("page", String(page));
  return `${HUB_URL}?${params.toString()}`;
}

function parseResultCount(html) {
  const match = String(html || "").match(/(\d+)\s+Results/i);
  return match ? Number(match[1]) : 0;
}

function parseListingPage(html) {
  const items = [];
  const rows = String(html || "").split(/<div class="views-row views-row-/);
  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    const titleMatch = row.match(
      /href="(\/scholarships\/[^"]+)"[^>]*>([^<]+)<\/a>/i,
    );
    if (!titleMatch) continue;
    const path = titleMatch[1];
    const title = stripTags(titleMatch[2]);
    const institutionMatch = row.match(
      /class="field-hei-institution-name"[^>]*>\s*([^<]+)/i,
    );
    const deadlineMatch = row.match(
      /class="field-scholarship-deadline"[^>]*>\s*([^<]+)/i,
    );
    items.push({
      title,
      path,
      sourceUrl: toAbsoluteUrl(path),
      organizationName: institutionMatch ? stripTags(institutionMatch[1]) : null,
      deadlineText: deadlineMatch ? stripTags(deadlineMatch[1]) : null,
    });
  }
  return items;
}

function mapDegreeLevel(raw) {
  const value = stripTags(raw).toLowerCase();
  if (!value) return null;
  if (value.includes("associate")) return "associate";
  if (value.includes("bachelor")) return "bachelor";
  if (value.includes("master")) return "master";
  if (value.includes("doctorate") && !value.includes("post")) return "doctorate";
  if (value.includes("post doctorate") || value.includes("post-doctorate")) return "postdoc";
  return null;
}

function extractField(html, className) {
  const match = String(html || "").match(
    new RegExp(`class="${className}"[\\s\\S]*?>\\s*([^<]+)`, "i"),
  );
  return match ? stripTags(match[1]) : null;
}

function extractScholarshipUrl(html) {
  const match = String(html || "").match(
    /class="field-scholarship-url"[\s\S]*?href="([^"]+)"/i,
  );
  if (!match) return null;
  return toAbsoluteUrl(decodeHtmlEntities(match[1]));
}

function extractMetaDescription(html) {
  const match = String(html || "").match(
    /name="description"\s+content="([^"]+)"/i,
  );
  return match ? stripTags(match[1]) : null;
}

function extractMetaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(html || "").match(
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
      "i",
    ),
  );
  return match ? stripTags(match[1]) : null;
}

function parseDetailPage(html, sourceUrl) {
  const title =
    extractMetaContent(html, "og:title") ||
    (() => {
      const m = String(html || "").match(/<title>([^<|]+)/i);
      return m ? stripTags(m[1].replace(/\s*\|\s*EducationUSA.*/i, "")) : null;
    })();
  const organizationName = extractField(html, "field-hei-institution-name");
  const degreeLevel = mapDegreeLevel(extractField(html, "field-scholarship-degree-levels"));
  const fieldOfStudy = extractField(html, "field-scholarship-majors");
  const deadlineText =
    extractField(html, "field-scholarship-deadline") ||
    extractField(html, "field-scholarship-deadline-type");
  const description = extractMetaDescription(html);
  const applicationUrl = extractScholarshipUrl(html) || sourceUrl;

  const resolvedDates = resolveApplicationDates({
    deadline: deadlineText,
    description: description || "",
    title: title || "",
  });

  return {
    title,
    organizationName,
    degreeLevel,
    fieldOfStudy,
    description,
    applicationUrl,
    sourceUrl,
    deadlineText,
    deadline: resolvedDates.deadline,
    applicationStartDate: resolvedDates.applicationStartDate,
    applicationEndDate: resolvedDates.applicationEndDate,
    isRolling: resolvedDates.isRolling,
  };
}

async function fetchHtml(url) {
  try {
    const response = await axios.get(url, {
      headers: REQUEST_HEADERS,
      timeout: 35000,
      maxRedirects: 5,
      validateStatus: () => true,
      responseType: "text",
      transformResponse: [(d) => d],
    });
    return { status: response.status, html: String(response.data || ""), error: null };
  } catch (err) {
    return {
      status: 0,
      html: "",
      error: err?.code || err?.message || "fetch_failed",
    };
  }
}

function dedupeBySourceUrl(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = String(item.sourceUrl || "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function fetchListingForFilter(filters = {}, options = {}) {
  const delayMs = options.delayMs ?? 120;
  const maxPages = options.maxPages ?? 40;
  const all = [];

  const first = await fetchHtml(buildFilterUrl(filters, 0));
  if (first.status >= 400) return all;

  const total = parseResultCount(first.html);
  all.push(...parseListingPage(first.html));
  const pageCount = total > 0 ? Math.ceil(total / 10) : 1;

  for (let page = 1; page < Math.min(pageCount, maxPages); page += 1) {
    if (delayMs > 0) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, delayMs));
    }
    // eslint-disable-next-line no-await-in-loop
    const { html, status } = await fetchHtml(buildFilterUrl(filters, page));
    if (status >= 400) break;
    const pageItems = parseListingPage(html);
    if (!pageItems.length) break;
    all.push(...pageItems);
  }

  return dedupeBySourceUrl(all);
}

async function enrichListingItems(listings, options = {}) {
  const delayMs = options.delayMs ?? 120;
  const enriched = [];

  for (const listing of listings) {
    if (delayMs > 0) {
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, delayMs));
    }
    // eslint-disable-next-line no-await-in-loop
    const { html, status, error } = await fetchHtml(listing.sourceUrl);
    if (error || status >= 400 || !html) {
      enriched.push({
        ...listing,
        applicationUrl: listing.sourceUrl,
        detailFetchFailed: true,
        detailFetchError: error || `http_${status}`,
      });
      continue;
    }
    const detail = parseDetailPage(html, listing.sourceUrl);
    enriched.push({
      ...listing,
      ...detail,
      title: detail.title || listing.title,
      organizationName: detail.organizationName || listing.organizationName,
      deadlineText: detail.deadlineText || listing.deadlineText,
      applicationUrl: detail.applicationUrl || listing.sourceUrl,
    });
  }

  return enriched;
}

async function fetchAllEducationUsaProgrammes(options = {}) {
  const delayMs = options.delayMs ?? 120;
  const fetchDetails = options.fetchDetails !== false;
  const byDegree = options.byDegree === true;
  const degreeTid = options.degreeTid || null;

  let listings = [];

  if (degreeTid) {
    listings = await fetchListingForFilter(
      { degreeTid, usStateTid: "All", countryTargetId: "" },
      options,
    );
  } else if (byDegree) {
    for (const filter of DEGREE_LEVEL_FILTERS.filter((f) => f.tid !== "All")) {
      // eslint-disable-next-line no-await-in-loop
      const batch = await fetchListingForFilter(
        { degreeTid: filter.tid, usStateTid: "All", countryTargetId: "" },
        options,
      );
      listings.push(...batch.map((item) => ({ ...item, filterDegreeTid: filter.tid })));
      if (delayMs > 0) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
    listings = dedupeBySourceUrl(listings);
  } else {
    listings = await fetchListingForFilter(
      { degreeTid: "All", usStateTid: "All", countryTargetId: "" },
      options,
    );
  }

  if (!fetchDetails) return listings;
  return enrichListingItems(listings, options);
}

function buildDescription(item) {
  if (item.description && item.description.length >= 80) {
    return item.description;
  }
  const org = item.organizationName ? ` ${item.organizationName} lists this award on EducationUSA.` : "";
  const deadline = item.deadlineText ? ` Apply by: ${item.deadlineText}.` : "";
  return (
    `${item.title} is a U.S. study financial aid opportunity published by EducationUSA (U.S. Department of State).${org}${deadline} ` +
    "See the official programme page for eligibility, award amounts, and how to apply."
  );
}

function toImportRecord(item) {
  const slug = String(item.path || "")
    .replace(/^\/scholarships\//, "")
    .replace(/\/+$/, "");
  const hash = crypto.createHash("sha1").update(item.sourceUrl.toLowerCase()).digest("hex").slice(0, 12);

  return {
    externalId: slug ? `edusa-${slug}` : `edusa-${hash}`,
    title: item.title,
    organizationName: item.organizationName || "EducationUSA listed institution",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: item.degreeLevel,
    fieldOfStudy: item.fieldOfStudy || null,
    fundingType: "partial_or_full",
    description: buildDescription(item),
    applicationUrl: item.applicationUrl || item.sourceUrl,
    sourceUrl: item.sourceUrl,
    deadline: item.deadline || null,
    applicationStartDate: item.applicationStartDate || null,
    applicationEndDate: item.applicationEndDate || null,
    isRolling: item.isRolling === true,
    ingestionTier: "government_trusted",
    eligibleRegions: ["international"],
  };
}

module.exports = {
  BASE_URL,
  HUB_URL,
  DEGREE_LEVEL_FILTERS,
  buildFilterUrl,
  parseListingPage,
  parseDetailPage,
  parseResultCount,
  fetchHtml,
  fetchListingForFilter,
  fetchAllEducationUsaProgrammes,
  toImportRecord,
  mapDegreeLevel,
};
