/**
 * Browse filter regions and field categories for public scholarship search.
 */

const REGIONS = [
  {
    id: "africa",
    label: "Africa",
    patterns: [
      /\bafrica\b/i,
      /^ethiopia$/i,
      /^kenya$/i,
      /^nigeria$/i,
      /^ghana$/i,
      /^uganda$/i,
      /^malawi$/i,
      /^south africa$/i,
      /^tanzania$/i,
      /^rwanda$/i,
      /^zimbabwe$/i,
      /^senegal$/i,
      /^cameroon$/i,
      /^mozambique$/i,
      /^zambia$/i,
    ],
  },
  {
    id: "europe",
    label: "Europe & UK",
    patterns: [
      /\beurope/i,
      /^european union$/i,
      /^united kingdom$/i,
      /\buk\b/i,
      /^germany$/i,
      /^france$/i,
      /^netherlands$/i,
      /^sweden$/i,
      /^italy$/i,
      /^spain$/i,
      /^norway$/i,
      /^switzerland$/i,
      /^belgium$/i,
      /^austria$/i,
      /^ireland$/i,
      /^poland$/i,
      /^czech/i,
      /^hungary$/i,
      /^portugal$/i,
      /^denmark$/i,
      /^finland$/i,
    ],
  },
  {
    id: "americas",
    label: "Americas",
    patterns: [
      /^united states$/i,
      /\busa\b/i,
      /^canada$/i,
      /^mexico$/i,
      /^chile$/i,
      /^brazil$/i,
      /^argentina$/i,
      /^colombia$/i,
      /^peru$/i,
      /\bamerica/i,
    ],
  },
  {
    id: "asia_pacific",
    label: "Asia & Pacific",
    patterns: [
      /\basia\b/i,
      /\bpacific\b/i,
      /^japan$/i,
      /^china$/i,
      /^india$/i,
      /^australia$/i,
      /^new zealand$/i,
      /^korea$/i,
      /^south korea$/i,
      /^singapore$/i,
      /^malaysia$/i,
      /^thailand$/i,
      /^indonesia$/i,
      /^vietnam$/i,
      /^philippines$/i,
      /^brunei$/i,
      /^taiwan$/i,
      /^bangladesh$/i,
      /^pakistan$/i,
    ],
  },
  {
    id: "middle_east",
    label: "Middle East",
    patterns: [
      /^turkey$/i,
      /^türkiye$/i,
      /^turkiye$/i,
      /^saudi/i,
      /^uae$/i,
      /^united arab emirates$/i,
      /^qatar$/i,
      /^kuwait$/i,
      /^oman$/i,
      /^jordan$/i,
      /^lebanon$/i,
      /^israel$/i,
      /^iran$/i,
      /^iraq$/i,
      /\bmiddle east\b/i,
    ],
  },
  {
    id: "global",
    label: "Global / multi-country",
    patterns: [
      /\bmultiple\b/i,
      /\bglobal\b/i,
      /\binternational\b/i,
      /\bworldwide\b/i,
      /\bdeveloping countries\b/i,
      /\ball countries\b/i,
      /\bvarious\b/i,
      /\bany country\b/i,
    ],
  },
];

const FIELD_CATEGORIES = [
  {
    id: "general",
    label: "General / open discipline",
    patterns: [
      /multiple discipline/i,
      /multi-?disciplinary/i,
      /approved master/i,
      /open discipline/i,
      /^general$/i,
      /^any field/i,
    ],
  },
  {
    id: "health",
    label: "Health & medicine",
    patterns: [/health/i, /medicine/i, /medical/i, /nursing/i, /public health/i, /population health/i],
  },
  {
    id: "business",
    label: "Business & management",
    patterns: [/business/i, /management/i, /mba/i, /commerce/i, /finance/i, /economics/i],
  },
  {
    id: "stem",
    label: "STEM & technology",
    patterns: [
      /engineering/i,
      /technology/i,
      /science and technology/i,
      /computer/i,
      /informatics/i,
      /mathematics/i,
      /physics/i,
      /chemistry/i,
    ],
  },
  {
    id: "research",
    label: "Research & doctoral",
    patterns: [/doctoral/i, /\bphd\b/i, /research/i, /science and research/i],
  },
  {
    id: "development_social",
    label: "Development & social sciences",
    patterns: [
      /development/i,
      /social science/i,
      /public policy/i,
      /governance/i,
      /resilience/i,
      /inclusion/i,
      /access, inclusion/i,
      /peace/i,
      /security/i,
      /crisis/i,
    ],
  },
  {
    id: "education",
    label: "Education & teaching",
    patterns: [/education/i, /teaching/i, /secondary school/i, /language teaching/i],
  },
  {
    id: "environment",
    label: "Agriculture & environment",
    patterns: [
      /agriculture/i,
      /forestry/i,
      /environment/i,
      /sustainability/i,
      /climate/i,
      /agro/i,
      /renewable/i,
    ],
  },
  {
    id: "arts_humanities",
    label: "Arts & humanities",
    patterns: [/arts/i, /humanities/i, /culture/i, /history/i, /literature/i],
  },
  {
    id: "law",
    label: "Law & policy",
    patterns: [/\blaw\b/i, /legal/i, /human rights/i],
  },
];

const REGION_IDS = new Set(REGIONS.map((r) => r.id));
const FIELD_CATEGORY_IDS = new Set(FIELD_CATEGORIES.map((c) => c.id));

function classifyCountryToRegion(country) {
  const value = String(country || "").trim();
  if (!value) return "other";
  for (const region of REGIONS) {
    if (region.patterns.some((re) => re.test(value))) return region.id;
  }
  return "other";
}

function classifyFieldToCategory(field) {
  const value = String(field || "").trim();
  if (!value) return "other";
  for (const cat of FIELD_CATEGORIES) {
    if (cat.patterns.some((re) => re.test(value))) return cat.id;
  }
  return "other";
}

function countryMatchesRegion(country, regionId) {
  if (regionId === "other") {
    return classifyCountryToRegion(country) === "other";
  }
  const region = REGIONS.find((r) => r.id === regionId);
  if (!region) return false;
  const value = String(country || "").trim();
  return region.patterns.some((re) => re.test(value));
}

function fieldMatchesCategory(field, categoryId) {
  if (categoryId === "other") {
    return classifyFieldToCategory(field) === "other";
  }
  const cat = FIELD_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) return false;
  const value = String(field || "").trim();
  return cat.patterns.some((re) => re.test(value));
}

function buildRegionFilterOptions(countryRows) {
  const counts = new Map();
  for (const row of countryRows) {
    const country = row.country ?? row;
    const count = Number(row.count ?? row.n ?? 1);
    const regionId = classifyCountryToRegion(country);
    counts.set(regionId, (counts.get(regionId) || 0) + count);
  }

  const options = REGIONS.map((r) => ({
    id: r.id,
    label: r.label,
    count: counts.get(r.id) || 0,
  })).filter((r) => r.count > 0);

  const otherCount = counts.get("other") || 0;
  if (otherCount > 0) {
    options.push({ id: "other", label: "Other destinations", count: otherCount });
  }

  return options.sort((a, b) => b.count - a.count);
}

function buildFieldCategoryFilterOptions(fieldRows) {
  const counts = new Map();
  for (const row of fieldRows) {
    const field = row.field_of_study ?? row.field ?? row;
    const count = Number(row.count ?? row.n ?? 1);
    const catId = classifyFieldToCategory(field);
    counts.set(catId, (counts.get(catId) || 0) + count);
  }

  const options = FIELD_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    count: counts.get(c.id) || 0,
  })).filter((c) => c.count > 0);

  const otherCount = counts.get("other") || 0;
  if (otherCount > 0) {
    options.push({ id: "other", label: "Other fields", count: otherCount });
  }

  return options.sort((a, b) => b.count - a.count);
}

function expandRegionsToCountries(selectedRegionIds, allCountries) {
  if (!selectedRegionIds?.length) return [];
  const expanded = new Set();
  for (const country of allCountries) {
    if (selectedRegionIds.some((regionId) => countryMatchesRegion(country, regionId))) {
      expanded.add(country);
    }
  }
  return [...expanded];
}

function expandFieldCategoriesToFields(selectedCategoryIds, allFields) {
  if (!selectedCategoryIds?.length) return [];
  const expanded = new Set();
  for (const field of allFields) {
    if (selectedCategoryIds.some((catId) => fieldMatchesCategory(field, catId))) {
      expanded.add(field);
    }
  }
  return [...expanded];
}

function isAllowedRegionId(id) {
  return REGION_IDS.has(String(id)) || id === "other";
}

function isAllowedFieldCategoryId(id) {
  return FIELD_CATEGORY_IDS.has(String(id)) || id === "other";
}

module.exports = {
  REGIONS,
  FIELD_CATEGORIES,
  classifyCountryToRegion,
  classifyFieldToCategory,
  buildRegionFilterOptions,
  buildFieldCategoryFilterOptions,
  expandRegionsToCountries,
  expandFieldCategoriesToFields,
  countryMatchesRegion,
  fieldMatchesCategory,
  isAllowedRegionId,
  isAllowedFieldCategoryId,
};
