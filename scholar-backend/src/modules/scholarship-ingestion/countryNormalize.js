/**
 * Normalize host (study) country and derive eligibility tags.
 */
const HOST_COUNTRY_ALIASES = {
  "multiple countries": "International",
  "multiple": "International",
  international: "International",
  africa: "Africa",
  global: "International",
  worldwide: "International",
  eu: "European Union",
  "european union": "European Union",
  uk: "United Kingdom",
  "united kingdom": "United Kingdom",
  usa: "United States",
  "united states of america": "United States",
};

const VALID_HOST_COUNTRIES = new Set([
  "Ethiopia",
  "Kenya",
  "Nigeria",
  "Ghana",
  "South Africa",
  "Uganda",
  "Tanzania",
  "Rwanda",
  "Germany",
  "United Kingdom",
  "United States",
  "Australia",
  "Canada",
  "France",
  "Netherlands",
  "Sweden",
  "Japan",
  "China",
  "International",
  "Africa",
  "European Union",
]);

function titleCaseCountry(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .map((w) => (w.length <= 3 && w !== "of" ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ")
    .replace(/\bOf\b/g, "of")
    .replace(/\bAnd\b/g, "and");
}

/**
 * Host country = where the award is administered / study destination when clear.
 */
function normalizeHostCountry(rawCountry) {
  const key = String(rawCountry || "").trim().toLowerCase();
  if (!key) return "International";
  if (HOST_COUNTRY_ALIASES[key]) return HOST_COUNTRY_ALIASES[key];
  const titled = titleCaseCountry(rawCountry);
  if (VALID_HOST_COUNTRIES.has(titled)) return titled;
  if (key.includes("international") || key.includes("global")) return "International";
  return titled;
}

function buildCountryFields(record, eligibleRegions = []) {
  const hostCountry = normalizeHostCountry(record.country || record.hostCountry);
  const regions = new Set(eligibleRegions || []);
  if (hostCountry === "International" || hostCountry === "Africa") {
    regions.add("international");
  }
  return {
    country: hostCountry,
    hostCountry,
    eligibleRegions: [...regions],
  };
}

module.exports = {
  normalizeHostCountry,
  buildCountryFields,
  HOST_COUNTRY_ALIASES,
};
