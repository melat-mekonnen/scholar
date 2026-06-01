/**
 * Map scholarship host (study destination) countries to browse filter regions.
 */

const ALLOWED_HOST_REGIONS = [
  "united_kingdom",
  "north_america",
  "europe",
  "africa",
  "asia_pacific",
  "global",
];

const AFRICAN_HOST_COUNTRIES = new Set([
  "Ethiopia",
  "Kenya",
  "Nigeria",
  "Ghana",
  "South Africa",
  "Uganda",
  "Tanzania",
  "Zambia",
  "Rwanda",
  "Malawi",
  "Sudan",
  "Sierra Leone",
  "Liberia",
  "Morocco",
  "Egypt",
  "Africa",
]);

const REGION_COUNTRY_MAP = {
  united_kingdom: ["United Kingdom"],
  north_america: ["United States", "Canada"],
  europe: ["Germany", "European Union", "France", "Netherlands", "Sweden"],
  africa: [...AFRICAN_HOST_COUNTRIES],
  asia_pacific: ["Australia", "Japan", "China", "India"],
  global: ["International"],
};

function normalizeHostCountry(value) {
  return String(value || "").trim();
}

function hostCountryToRegion(hostCountry) {
  const country = normalizeHostCountry(hostCountry);
  if (!country) return null;
  if (country === "United Kingdom") return "united_kingdom";
  if (country === "United States" || country === "Canada") return "north_america";
  if (["Germany", "European Union", "France", "Netherlands", "Sweden"].includes(country)) {
    return "europe";
  }
  if (AFRICAN_HOST_COUNTRIES.has(country)) return "africa";
  if (["Australia", "Japan", "China", "India"].includes(country)) return "asia_pacific";
  if (country === "International") return "global";
  return null;
}

function hostRegionLabel(slug) {
  switch (String(slug || "").toLowerCase()) {
    case "united_kingdom":
      return "United Kingdom";
    case "north_america":
      return "North America";
    case "europe":
      return "Europe";
    case "africa":
      return "Africa";
    case "asia_pacific":
      return "Asia-Pacific";
    case "global":
      return "Global / multi-country";
    default:
      return slug.replace(/_/g, " ");
  }
}

function hostCountriesForRegions(regions) {
  const countries = new Set();
  for (const region of regions || []) {
    const key = String(region || "").toLowerCase();
    if (!ALLOWED_HOST_REGIONS.includes(key)) continue;
    for (const country of REGION_COUNTRY_MAP[key] || []) {
      countries.add(country);
    }
  }
  return [...countries];
}

function aggregateHostRegionFacets(countryFacets) {
  const counts = new Map();
  for (const facet of countryFacets || []) {
    const region = hostCountryToRegion(facet.value);
    if (!region) continue;
    counts.set(region, (counts.get(region) || 0) + (facet.count || 0));
  }
  return ALLOWED_HOST_REGIONS.filter((region) => counts.has(region)).map((region) => ({
    value: region,
    count: counts.get(region) || 0,
  }));
}

module.exports = {
  ALLOWED_HOST_REGIONS,
  hostCountryToRegion,
  hostRegionLabel,
  hostCountriesForRegions,
  aggregateHostRegionFacets,
};
