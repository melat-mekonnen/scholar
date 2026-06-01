const {
  isBareHomepageUrl,
  isNonProgrammeHubUrl,
  isListingHubUrl,
} = require("../descriptionQuality");

/** Country pickers / central portals — not a single programme page. */
const GENERIC_APPLY_PORTAL_PATTERNS = [
  /^https?:\/\/(www\.)?chevening\.org\/apply\/?$/i,
  /^https?:\/\/(www\.)?cscuk\.fcdo\.gov\.uk\/apply\/?$/i,
  /^https?:\/\/foreign\.fulbrightonline\.org\/apply\/?$/i,
];

/** Path signals that the URL targets one programme, route, or course. */
const PROGRAMME_PATH_SIGNAL =
  /commonwealth|shared|csss|nominator|#nominator-|fellowship|scholarship\/|foreign-student|flta|courses\/|programmes\/|postgraduate-taught|postgraduate-scholarships|application-timeline|epos|erasmus-mundus|stipendium\/datenbank|scholarship-database|\bdetail=/i;

const CSC_SHARED_GENERIC_URL =
  /^https?:\/\/(www\.)?cscuk\.fcdo\.gov\.uk\/scholarships\/commonwealth-shared-scholarships(-applications)?\/?$/i;

function isCommonwealthSharedRecord(externalId) {
  return /^(commonwealth-shared|shared-course)-/.test(String(externalId || ""));
}

function isCscSharedGenericUrl(url) {
  return CSC_SHARED_GENERIC_URL.test(
    String(url || "")
      .trim()
      .replace(/#.*$/, ""),
  );
}

/** Curated scrape rows that legitimately use a discovery / national portal URL. */
const ALLOWED_GENERIC_EXTERNAL_IDS = new Set([
  "erasmus-mundus-catalogue",
  "za-nsfas",
]);

/** Official national scholarship board pages (single programme portal, not a multi-programme index). */
const NATIONAL_PROGRAMME_BOARD_PATTERNS = [
  /jkf\.co\.ke\/index\.php\/scholarships\/?$/i,
  /education\.gov\.ng\/federal-scholarships-board\/?$/i,
];

function isNationalProgrammeBoardUrl(url) {
  return NATIONAL_PROGRAMME_BOARD_PATTERNS.some((re) => re.test(String(url || "")));
}

function normalizeUrlForCompare(url) {
  return String(url || "")
    .trim()
    .replace(/\/+$/, "")
    .toLowerCase();
}

function baseUrlWithoutHash(url) {
  try {
    const parsed = new URL(String(url || ""));
    parsed.hash = "";
    return normalizeUrlForCompare(parsed.href);
  } catch {
    return normalizeUrlForCompare(String(url || "").replace(/#.*$/, ""));
  }
}

function isGenericMultiCountryApplyPortal(url) {
  const base = String(url || "")
    .trim()
    .replace(/#.*$/, "");
  return GENERIC_APPLY_PORTAL_PATTERNS.some((re) => re.test(base));
}

function isProgrammeSpecificApplyUrl(url) {
  if (!url || isBareHomepageUrl(url) || isNonProgrammeHubUrl(url)) return false;
  if (isGenericMultiCountryApplyPortal(url)) return false;

  try {
    const parsed = new URL(url);
    if (parsed.hash && /^#nominator-/i.test(parsed.hash)) return true;
    if (PROGRAMME_PATH_SIGNAL.test(`${parsed.pathname}${parsed.hash}`)) return true;
    if (!isListingHubUrl(url)) return true;
  } catch {
    return false;
  }

  return false;
}

function auditCuratedApplyRecord(record) {
  const apply = record.applicationUrl || record.sourceUrl;
  const source = record.sourceUrl || record.applicationUrl;
  const issues = [];
  const isSharedPlacement = isCommonwealthSharedRecord(record.externalId);

  if (!apply) issues.push("missing_apply_url");
  if (isSharedPlacement && isCscSharedGenericUrl(apply)) {
    issues.push("generic_csc_shared_scheme");
  }
  if (apply && !isSharedPlacement && isBareHomepageUrl(apply)) issues.push("bare_homepage");
  if (apply && !isSharedPlacement && isNonProgrammeHubUrl(apply)) issues.push("non_programme_hub");
  if (apply && isGenericMultiCountryApplyPortal(apply) && !ALLOWED_GENERIC_EXTERNAL_IDS.has(record.externalId)) {
    issues.push("generic_apply_portal");
  }
  if (
    apply &&
    !isSharedPlacement &&
    isListingHubUrl(apply) &&
    !ALLOWED_GENERIC_EXTERNAL_IDS.has(record.externalId)
  ) {
    if (!PROGRAMME_PATH_SIGNAL.test(apply) && !isNationalProgrammeBoardUrl(apply)) {
      issues.push("listing_hub");
    }
  }
  if (
    apply &&
    source &&
    baseUrlWithoutHash(apply) !== baseUrlWithoutHash(source)
  ) {
    issues.push("apply_source_mismatch");
  }

  return issues;
}

function auditCuratedCatalogRecords(records) {
  return records
    .map((record) => {
      const issues = auditCuratedApplyRecord(record);
      if (issues.length === 0) return null;
      return {
        externalId: record.externalId,
        title: record.title,
        applicationUrl: record.applicationUrl,
        sourceUrl: record.sourceUrl,
        issues,
      };
    })
    .filter(Boolean);
}

module.exports = {
  ALLOWED_GENERIC_EXTERNAL_IDS,
  auditCuratedApplyRecord,
  auditCuratedCatalogRecords,
  isCommonwealthSharedRecord,
  isCscSharedGenericUrl,
  isGenericMultiCountryApplyPortal,
  isNationalProgrammeBoardUrl,
  isProgrammeSpecificApplyUrl,
  baseUrlWithoutHash,
  normalizeUrlForCompare,
};
