const FIELD_CATEGORIES = Object.freeze({
  public_health: "Public health",
  international_development: "International development",
  business: "Business & management",
  data_science: "Data science & analytics",
  law: "Law",
  education: "Education",
  engineering: "Engineering & technology",
  research: "Doctoral research",
  professional_development: "Professional development",
  general: "General / multi-disciplinary",
});

const ALLOWED_FIELD_CATEGORIES = new Set(Object.keys(FIELD_CATEGORIES));

const CATEGORY_RULES = [
  {
    category: "public_health",
    patterns: [/public health/, /population health/, /health systems and capacity/],
  },
  {
    category: "data_science",
    patterns: [/data science/, /analytical sciences/],
  },
  {
    category: "business",
    patterns: [/\bbusiness\b/, /arts and enterprise/, /business and management/],
  },
  { category: "law", patterns: [/\blaw\b/] },
  {
    category: "education",
    patterns: [/language teaching/, /\beducation\b/],
  },
  {
    category: "engineering",
    patterns: [/humanitarian engineering/, /\bengineering\b/],
  },
  {
    category: "research",
    patterns: [/doctoral research/, /split-site phd/, /phd scholarship/],
  },
  {
    category: "professional_development",
    patterns: [/professional development/, /fellowship/],
  },
  {
    category: "international_development",
    patterns: [
      /international development/,
      /development studies/,
      /sustainable development/,
      /strengthening resilience/,
      /access, inclusion and opportunity/,
      /strengthening global peace/,
      /promoting innovation and entrepreneurship/,
      /science and technology for development/,
    ],
  },
  {
    category: "general",
    patterns: [
      /multiple disciplines/,
      /multi-disciplinary/,
      /multi disciplinary/,
      /approved master'?s courses/,
      /participating uk universities/,
      /scholarships and bursaries/,
    ],
  },
];

function normalizeHaystack(values) {
  return values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function resolveFieldCategory({ fieldOfStudy, title, degreeLevel } = {}) {
  const haystack = normalizeHaystack([fieldOfStudy, title]);

  if (!haystack) {
    return degreeLevel === "phd" ? "research" : "general";
  }

  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(haystack))) {
      return rule.category;
    }
  }

  if (degreeLevel === "phd") return "research";

  return "general";
}

function fieldCategoryLabel(category) {
  if (!category) return "General / multi-disciplinary";
  return FIELD_CATEGORIES[category] || category.replace(/_/g, " ");
}

module.exports = {
  FIELD_CATEGORIES,
  ALLOWED_FIELD_CATEGORIES,
  resolveFieldCategory,
  fieldCategoryLabel,
};
