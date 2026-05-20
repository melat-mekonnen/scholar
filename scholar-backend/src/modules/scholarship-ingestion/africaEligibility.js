const { isAfricanSourceDomain } = require("./africanDomains");

/**
 * Infer African-student relevance from programme text (heuristic).
 */
const AFRICA_PATTERNS = [
  /\bafrica(n)?\b/i,
  /\bsub-?saharan\b/i,
  /\bcommonwealth\b/i,
  /\bdeveloping countr/i,
  /\bleast developed\b/i,
  /\bldc\b/i,
  /\bethiopia(n)?\b/i,
  /\bkenya(n)?\b/i,
  /\bnigeria(n)?\b/i,
  /\bghana(ian)?\b/i,
  /\bsouth africa(n)?\b/i,
  /\buganda(n)?\b/i,
  /\btanzania(n)?\b/i,
  /\brwanda(n)?\b/i,
  /\binternational students?\b/i,
  /\bglobal south\b/i,
];

const EXCLUDE_HIGH_INCOME_ONLY = [
  /\bhigh income countr/i,
  /\boecd countr/i,
  /\bus citizens only\b/i,
  /\buk nationals only\b/i,
];

function parseEligibleRegions(text, sourceUrl = null) {
  const hay = String(text || "");
  const regions = new Set();

  if (AFRICA_PATTERNS.some((re) => re.test(hay))) {
    regions.add("africa");
  }
  if (/\bcommonwealth\b/i.test(hay)) regions.add("commonwealth");
  if (/\binternational students?\b/i.test(hay) || /\bglobal\b/i.test(hay)) {
    regions.add("international");
  }
  if (/\bdeveloping countr/i.test(hay) || /\bleast developed\b/i.test(hay)) {
    regions.add("developing");
  }

  if (sourceUrl && isAfricanSourceDomain(sourceUrl)) {
    regions.add("africa");
  }

  const excluded = EXCLUDE_HIGH_INCOME_ONLY.some((re) => re.test(hay));
  if (excluded && regions.size === 0) {
    regions.add("limited_eligibility");
  }

  return [...regions];
}

function isOpenToAfricanStudents(text, sourceUrl = null) {
  const regions = parseEligibleRegions(text, sourceUrl);
  if (regions.includes("limited_eligibility")) return false;
  return (
    regions.includes("africa") ||
    regions.includes("commonwealth") ||
    regions.includes("developing") ||
    regions.includes("international")
  );
}

/** Quality-score boost when source is African-origin (ranking, not gating). */
function africaSourceBoostScore(sourceUrl) {
  return isAfricanSourceDomain(sourceUrl) ? 8 : 0;
}

module.exports = {
  parseEligibleRegions,
  isOpenToAfricanStudents,
  africaSourceBoostScore,
};
