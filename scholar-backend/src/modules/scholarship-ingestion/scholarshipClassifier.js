/**
 * Reject navigation, blog, archive, and SEO pages that are not single scholarship programmes.
 */
const {
  isPollutedDescription,
  isLowQualityTitle,
  isListingHubUrl,
  isBareHomepageUrl,
  isNonProgrammeHubUrl,
} = require("./descriptionQuality");
const { isHubTitle } = require("./govTrustedDomains");

const NON_SCHOLARSHIP_TITLE_PATTERNS = [
  /^home\s*\|/i,
  /^homepage\s*\|/i,
  /^news\s*\|/i,
  /\barchives?\b/i,
  /\bby country archives?\b/i,
  /\bby level archives?\b/i,
  /\bby courses? archives?\b/i,
  /^why advertise\b/i,
  /^scholarships archives?\b/i,
  /^xfn \d/i,
  /^erasmus mundus catalogue$/i,
  /^foreign fulbright program\b/i,
  /^apply$/i,
  /^scholars?$/i,
  /^studying abroad$/i,
  /^ethiopia foreign study programmes?$/i,
  /^foreign study programmes?$/i,
  /^department of higher education and training$/i,
  /^internationalscholarships\./i,
  /toto|casino|slot|bandar|togel|betting|macau/i,
  /^global grant community$/i,
  /^university of nairobi \| committed/i,
  /^news \| university of nairobi$/i,
  /^home \| university of ghana$/i,
  /^home \| university of ibadan$/i,
  /^home \| univer/i,
];

const NON_SCHOLARSHIP_URL_PATTERNS = [
  /\/category\//i,
  /\/tag\//i,
  /\/archive/i,
  /\/page\/\d+/i,
  /\/author\//i,
  /\/advertise/i,
  /\/why-advertise/i,
  /\/feed\/?$/i,
  /xmlrpc\.php/i,
  /\.(css|js|woff|jpg|png|gif)(\?|$)/i,
];

const SCHOLARSHIP_SIGNAL_PATTERNS = [
  /\bscholarship\b/i,
  /\bfellowship\b/i,
  /\bgrant\b/i,
  /\bbursar/i,
  /\bfunding\b/i,
  /\bapply\b/i,
  /\beligibility\b/i,
  /\bdeadline\b/i,
  /\bfully\s*funded\b/i,
  /\btuition\b/i,
];

function normalizeOrg(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hasScholarshipSignals(record) {
  const hay = `${record.title || ""} ${record.description || ""} ${record.applicationUrl || ""}`;
  const matches = SCHOLARSHIP_SIGNAL_PATTERNS.filter((re) => re.test(hay)).length;
  return matches >= 2;
}

/**
 * @returns {{ reject: boolean, reason: string|null, category: string|null }}
 */
function classifyScholarshipRecord(record) {
  const title = String(record.title || "").trim();
  const description = String(record.description || "");
  const applicationUrl = record.applicationUrl || record.sourceUrl || "";

  if (!title || title.length < 8) {
    return { reject: true, reason: "title too short", category: "invalid" };
  }

  if (NON_SCHOLARSHIP_TITLE_PATTERNS.some((re) => re.test(title))) {
    return { reject: true, reason: "non-scholarship page title", category: "navigation" };
  }

  if (isLowQualityTitle(title) || isHubTitle(title)) {
    return { reject: true, reason: "generic listing or hub title", category: "listing" };
  }

  for (const url of [applicationUrl, record.sourceUrl]) {
    if (!url) continue;
    if (isNonProgrammeHubUrl(url)) {
      return { reject: true, reason: "ministry or language hub URL", category: "listing" };
    }
    if (isListingHubUrl(url)) {
      return { reject: true, reason: "listing hub URL", category: "listing" };
    }
    if (NON_SCHOLARSHIP_URL_PATTERNS.some((re) => re.test(url))) {
      return { reject: true, reason: "non-programme URL pattern", category: "navigation" };
    }
  }

  if (isPollutedDescription(description)) {
    return { reject: true, reason: "polluted or multi-programme description", category: "listing" };
  }

  if (!hasScholarshipSignals(record)) {
    return { reject: true, reason: "missing scholarship signals", category: "low_signal" };
  }

  return { reject: false, reason: null, category: null };
}

module.exports = {
  classifyScholarshipRecord,
  hasScholarshipSignals,
  normalizeOrg,
  NON_SCHOLARSHIP_TITLE_PATTERNS,
};
