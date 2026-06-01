const { hostnameFromUrl } = require("../govTrustedDomains");
const { isListingHubUrl } = require("../descriptionQuality");

/** Single-segment uscholarships.us index pages — not individual articles. */
const USCHOLARSHIPS_CATEGORY_SLUGS = new Set([
  "masters",
  "phd",
  "fellowship",
  "undergraduate",
  "entrepreneurs",
  "internship",
  "mba",
  "training",
  "grants",
  "scholarships-in",
  "scholarships-by",
  "scholarships-for",
  "scholarships-by-course",
  "african-students",
  "fully-funded",
  "women",
  "best-scholarships",
]);

const STATIC_ASSET_EXCLUDE = [
  /\/feed\/?$/i,
  /\/comments\/feed\/?$/i,
  /\/wp-content\//i,
  /\/wp-includes\//i,
  /\/wp-json/i,
  /\/xmlrpc\.php/i,
  /\/oembed\//i,
  /\?s=/i,
  /&#038;/i,
  /\.(css|js|woff2?|ttf|eot|ico|jpe?g|png|gif|svg|webp)(\?|$)/i,
];

const NAV_EXCLUDE = [
  /\/(contact|faq|glossary|calendar|partners|history|saved|privacy-policy|about-scholarship-union|our-vision-mission|how-to-use-scholarship-union)\/?$/i,
  /\/scholarships-list\/?$/i,
  /\/category\//i,
  /\/tag\//i,
  /\/page\/\d+\/?$/i,
  /\/author\//i,
];

const BLOG_LISTICLE_EXCLUDE = [
  /^how-to-/i,
  /^study-in-/i,
  /-guide-for-/i,
  /^european-countries-for-/i,
  /^free-laptop-for-/i,
  /^about-/i,
];

const SCHOLARSHIP_SLUG_SIGNALS =
  /scholarship|fellowship|grant|internship|funding|award|bursar|programme|program|diploma|trainee|summit|workshop/i;

function pathParts(url) {
  try {
    return new URL(url).pathname.split("/").filter(Boolean);
  } catch {
    return [];
  }
}

function lastSlug(url) {
  const parts = pathParts(url);
  return (parts[parts.length - 1] || "").toLowerCase();
}

function isExcludedUsAggregatorPath(url) {
  const hay = String(url || "");
  if (/#/.test(hay)) return true;
  if (STATIC_ASSET_EXCLUDE.some((re) => re.test(hay))) return true;
  if (NAV_EXCLUDE.some((re) => re.test(hay))) return true;
  if (isListingHubUrl(url)) return true;

  const host = hostnameFromUrl(url);
  if (host.includes("uscholarships.us")) {
    const parts = pathParts(url);
    if (parts.length === 1 && USCHOLARSHIPS_CATEGORY_SLUGS.has(parts[0].toLowerCase())) {
      return true;
    }
  }

  return false;
}

function isUscholarshipsArticleUrl(url) {
  if (isExcludedUsAggregatorPath(url)) return false;

  const parts = pathParts(url);
  if (parts.length === 0) return false;

  if (parts.length === 1 && USCHOLARSHIPS_CATEGORY_SLUGS.has(parts[0].toLowerCase())) {
    return false;
  }

  if (parts.length === 2 && USCHOLARSHIPS_CATEGORY_SLUGS.has(parts[0].toLowerCase()) && /^\d+$/.test(parts[1])) {
    return false;
  }

  const slug = lastSlug(url);
  if (slug.length < 12) return false;
  if (!SCHOLARSHIP_SLUG_SIGNALS.test(slug) && !/\d{4}/.test(slug)) return false;

  return parts.length >= 1;
}

function isScholarshipUnionArticleUrl(url) {
  if (isExcludedUsAggregatorPath(url)) return false;

  const parts = pathParts(url);
  if (parts.length !== 1) return false;

  const slug = parts[0].toLowerCase();
  if (slug.length < 15) return false;
  if (BLOG_LISTICLE_EXCLUDE.some((re) => re.test(slug))) return false;
  if (!SCHOLARSHIP_SLUG_SIGNALS.test(slug) && !/\d{4}/.test(slug)) return false;

  return true;
}

function isScholarshipTabArticleUrl(url) {
  if (isExcludedUsAggregatorPath(url)) return false;

  const parts = pathParts(url);
  if (parts.length < 2) return false;
  if (parts[0] === "category") return false;

  const slug = lastSlug(url);
  if (slug.length < 12) return false;
  if (!SCHOLARSHIP_SLUG_SIGNALS.test(slug) && !/\d{4}/.test(slug)) return false;

  return true;
}

function isUsAggregatorArticleUrl(url, sourceKey) {
  const host = hostnameFromUrl(url);
  if (!host) return false;

  if (sourceKey === "us_scholarships") {
    if (!host.includes("uscholarships.us")) return false;
    return isUscholarshipsArticleUrl(url);
  }
  if (sourceKey === "scholarship_union") {
    if (!host.includes("scholarshipunion.com")) return false;
    return isScholarshipUnionArticleUrl(url);
  }
  if (sourceKey === "scholarship_tab") {
    if (!host.includes("scholarshiptab.com")) return false;
    return isScholarshipTabArticleUrl(url);
  }

  return !isExcludedUsAggregatorPath(url);
}

function filterUsAggregatorArticleUrls(urls, source) {
  const key = source?.key || "";
  const host = hostnameFromUrl(source?.hubUrl || "");
  const out = [];
  const seen = new Set();

  for (const url of urls || []) {
    if (!url || seen.has(url)) continue;
    const linkHost = hostnameFromUrl(url);
    if (host && linkHost !== host && !linkHost.endsWith(`.${host.replace(/^www\./, "")}`)) {
      continue;
    }
    if (!isUsAggregatorArticleUrl(url, key)) continue;
    seen.add(url);
    out.push(url);
  }

  return out;
}

module.exports = {
  USCHOLARSHIPS_CATEGORY_SLUGS,
  isUsAggregatorArticleUrl,
  filterUsAggregatorArticleUrls,
  isExcludedUsAggregatorPath,
};
