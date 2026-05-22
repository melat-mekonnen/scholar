const BOILERPLATE_PATTERNS = [
  /The Fulbright U\.S\. Student Program provides grants/i,
  /The 2027-20\d{2} Competition is now open/i,
  /Start an application\s*\./i,
  /United States citizens who are currently enrolled in undergraduate/i,
  /If you are a U\.S\. citizen, will hold a bachelor/i,
  /Increase Text Decrease Text Grayscale/i,
  /Open toolbar Accessibility Tools/i,
  /\/\/-->\s*Open toolbar/i,
  /Cookie Policy|Accept all cookies/i,
  /Erasmus\+ helps organise student and doctoral candidate exchanges\.\s*There's no ce/i,
  /Chevening Scholarships\s+Are you eligible for a scholarship\? Learn more/i,
  /Are you eligible for a scholarship\? Learn more about Chevening/i,
];

const JUNK_LINE_PATTERNS = [
  /^\/\*\/\s*\/\/-->/,
  /^About Us$/,
  /^Accessibility Tools$/,
  /^\*\/$/,
];

const POLLUTED_DESCRIPTION_PATTERNS = [
  /page you requested could not be found/i,
  /try refining your search/i,
  /use the navigation above to locate the post/i,
  /error 404|404 not found/i,
  /Oops!\s*That page can't be found/i,
];

const GENERIC_TITLE_PATTERNS = [
  /^scholarships?\s*archive/i,
  /page\s+\d+\s+of\s+\d+/i,
  /^scholarships?\s*\|/i,
  /^federal government scholarship awards?$/i,
  /^scholarships?\s+and\s+bursaries$/i,
  /^scholarships?\s*&\s*bursaries$/i,
];

function isGenericBoilerplate(text) {
  const hay = String(text || "").trim();
  if (hay.length < 40) return true;
  if (POLLUTED_DESCRIPTION_PATTERNS.some((re) => re.test(hay))) return true;
  return BOILERPLATE_PATTERNS.some((re) => re.test(hay));
}

function countMatches(text, re) {
  return (String(text || "").match(re) || []).length;
}

/** Multiple programme headlines scraped from a listing/index page. */
function hasConcatenatedProgrammeListings(text) {
  const hay = String(text || "");
  if (countMatches(hay, /CALL FOR APPLICATIONS/gi) >= 2) return true;
  if (countMatches(hay, /PARTIALLY FUNDED SCHOLARSHIP/gi) >= 2) return true;
  if (countMatches(hay, /PROVISION OF TUITION FREE/gi) >= 2) return true;
  if (countMatches(hay, /LAUNCH OF THE \d/gi) >= 2) return true;

  const lines = hay
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 35);
  const capsProgrammeLines = lines.filter(
    (line) =>
      line.length >= 40 &&
      line === line.toUpperCase() &&
      /SCHOLARSHIP|FELLOWSHIP|PROGRAMME|PROGRAM|INTAKE|MOFCOM/i.test(line),
  );
  return capsProgrammeLines.length >= 3;
}

function isPollutedDescription(text) {
  const hay = String(text || "").trim();
  if (!hay) return true;
  if (isGenericBoilerplate(hay)) return true;
  if (hasConcatenatedProgrammeListings(hay)) return true;
  return false;
}

function isLowQualityTitle(title) {
  const t = String(title || "").trim();
  if (t.length < 8) return true;
  if (GENERIC_TITLE_PATTERNS.some((re) => re.test(t))) return true;
  if (/archive/i.test(t) && /page\s+\d+/i.test(t)) return true;
  if (t.length > 200) return true;
  return false;
}

/** Bare domain homepages (e.g. https://warwick.ac.uk/) — not leaf programme pages. */
function isBareHomepageUrl(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    return path === "" || path === "/";
  } catch {
    return true;
  }
}

/** URLs that are index/listing pages, not a single programme. */
function isListingHubUrl(url) {
  let pathname = "";
  try {
    pathname = new URL(url).pathname.toLowerCase();
  } catch {
    return true;
  }

  if (/\/page\/\d+/i.test(pathname)) return true;
  if (/\/archive/i.test(pathname)) return true;
  if (/\/category\//i.test(pathname)) return true;
  if (/\/tag\//i.test(pathname)) return true;
  if (/\/scholarships-opportunities\/?$/i.test(pathname)) return true;
  if (/\/scholarships-and-bursaries\/?$/i.test(pathname)) return true;
  if (/\/index\.php\/scholarships\/?$/i.test(pathname)) return true;

  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] || "";

  if (/\/scholarships\/?$/i.test(pathname) && segments.length <= 2) return true;
  if (last === "scholarships" || last === "bursaries" || last === "funding") return true;
  if (segments.length === 1 && (last === "scholarships" || last === "opportunities")) return true;

  return false;
}

function cleanDescriptionLines(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 20 && !JUNK_LINE_PATTERNS.some((re) => re.test(line)))
    .filter((line) => !isGenericBoilerplate(line));
}

function normalizeForCompare(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function descriptionSimilarity(a, b) {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.92;
  return 0;
}

/**
 * Prefer programme-specific text over site template / duplicate boilerplate.
 */
function shouldAcceptEnrichedDescription(existing, incoming) {
  const next = String(incoming || "").trim();
  if (!next || next.length < 80) return false;
  if (isGenericBoilerplate(next) || isPollutedDescription(next)) return false;

  const prev = String(existing || "").trim();
  if (!prev) return true;
  if (isGenericBoilerplate(prev)) return true;
  if (descriptionSimilarity(prev, next) >= 0.92) return false;

  return next.length >= Math.max(80, Math.floor(prev.length * 0.85));
}

function mergeDescription({ intro, paragraphs, bullets, minLength = 120 }) {
  const cleanIntro = intro && !isGenericBoilerplate(intro) ? intro.trim() : "";
  const cleanParagraphs = (paragraphs || []).filter((p) => p && !isGenericBoilerplate(p));
  const cleanBullets = (bullets || []).filter((b) => b && !isGenericBoilerplate(b) && !JUNK_LINE_PATTERNS.some((re) => re.test(b)));

  const parts = [];
  if (cleanIntro) parts.push(cleanIntro);
  if (cleanParagraphs.length) parts.push(cleanParagraphs.join("\n\n"));
  if (cleanBullets.length) {
    parts.push("Key points:\n" + cleanBullets.map((b) => `• ${b}`).join("\n"));
  }

  const full = parts.join("\n\n").trim();
  if (full.length < minLength) return null;
  return full.length > 4000 ? `${full.slice(0, 3997)}...` : full;
}

module.exports = {
  isGenericBoilerplate,
  isPollutedDescription,
  isLowQualityTitle,
  isBareHomepageUrl,
  isListingHubUrl,
  hasConcatenatedProgrammeListings,
  shouldAcceptEnrichedDescription,
  mergeDescription,
  cleanDescriptionLines,
  descriptionSimilarity,
};
