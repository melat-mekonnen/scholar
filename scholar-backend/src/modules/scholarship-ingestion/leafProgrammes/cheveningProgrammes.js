const CHEVENING_APPLY = "https://www.chevening.org/apply/";
const CHEVENING_TIMELINE = "https://www.chevening.org/scholarships/application-timeline/";

const CHEVENING_CYCLE = {
  academicYear: "2026-2027",
  applicationStatus: "closed",
};

function cheveningCountryDescription(countryLabel, countryPageUrl) {
  return [
    `Chevening Scholarship for citizens of ${countryLabel} (${CHEVENING_CYCLE.academicYear}).`,
    "Fully funded UK government award for a one-year master's degree at a UK university, including tuition, living costs, travel, and visa support for emerging leaders.",
    `Applications for ${CHEVENING_CYCLE.academicYear} Chevening Scholarships are currently ${CHEVENING_CYCLE.applicationStatus}.`,
    "When open, apply through the official Chevening online application system linked from the country programme page.",
    `Official country programme page: ${countryPageUrl}`,
    `Central apply portal (when open): ${CHEVENING_APPLY}`,
    `Application timeline: ${CHEVENING_TIMELINE}`,
  ].join(" ");
}

function cheveningFellowshipDescription({ title, host, nationality, duration, focus }) {
  return [
    `${title} is funded by the UK Foreign, Commonwealth and Development Office and hosted by ${host}.`,
    focus,
    `Eligible nationality: ${nationality}. Duration: ${duration}.`,
    `Applications for the current Chevening fellowship cycle are ${CHEVENING_CYCLE.applicationStatus}.`,
    "When open, apply through the official Chevening fellowships application process.",
    `Chevening apply portal: ${CHEVENING_APPLY}`,
  ].join(" ");
}

const CHEVENING_AFRICAN_COUNTRIES = [
  { slug: "ethiopia", label: "Ethiopia" },
  { slug: "kenya", label: "Kenya" },
  { slug: "nigeria", label: "Nigeria" },
  { slug: "ghana", label: "Ghana" },
  { slug: "south-africa", label: "South Africa" },
  { slug: "uganda", label: "Uganda" },
  { slug: "tanzania", label: "Tanzania" },
  { slug: "zambia", label: "Zambia" },
  { slug: "malawi", label: "Malawi" },
  { slug: "rwanda", label: "Rwanda" },
  { slug: "sierra-leone", label: "Sierra Leone" },
  { slug: "liberia", label: "Liberia" },
  { slug: "sudan", label: "Sudan" },
  { slug: "egypt", label: "Egypt" },
  { slug: "morocco", label: "Morocco" },
];

const CHEVENING_FELLOWSHIPS = [
  {
    slug: "lse",
    title: "Chevening LSE Fellowship",
    url: "https://www.chevening.org/fellowship/lse/",
    host: "London School of Economics and Political Science (LSE)",
    nationality: "China",
    duration: "3, 6, or 9 months (start October)",
    focus:
      "Mid-career research fellowship in social sciences with emphasis on international relations, public policy, development studies, and related fields.",
    degreeLevel: "phd",
    country: "China",
    eligibleRegions: ["asia"],
  },
  {
    slug: "india-cyber-security",
    title: "Chevening India Cyber Security Fellowship",
    url: "https://www.chevening.org/fellowship/india-cyber-security/",
    host: "Cranfield University (Defence Academy, Shrivenham)",
    nationality: "India",
    duration: "10 weeks (March–May)",
    focus:
      "Mid-career fellowship for Indian professionals in cyber security and cyber policy covering threats, governance, law, and digital resilience.",
    degreeLevel: "master",
    country: "India",
    eligibleRegions: ["asia"],
  },
  {
    slug: "health",
    title: "Chevening Healthcare, Health Policy, and Health Reform Fellowship",
    url: "https://www.chevening.org/fellowship/health/",
    host: "University of Oxford",
    nationality: "China",
    duration: "6 months (October–April)",
    focus:
      "Research fellowship for mid-career health and social policy professionals aligned with UK global health priorities.",
    degreeLevel: "master",
    country: "China",
    eligibleRegions: ["asia"],
  },
];

function cheveningCountryLeafProgrammes() {
  return CHEVENING_AFRICAN_COUNTRIES.map((entry) => {
    const url = `https://www.chevening.org/scholarship/${entry.slug}/`;
    return {
      externalId: `chevening-country-${entry.slug}`,
      title: `Chevening Scholarship — ${entry.label}`,
      organizationName: "Chevening / UK Government",
      country: entry.label,
      hostCountry: "United Kingdom",
      degreeLevel: "master",
      fieldOfStudy: "multiple disciplines",
      fundingType: "fully_funded",
      applicationUrl: url,
      url,
      sourceUrl: url,
      applicationStartDate: null,
      applicationEndDate: null,
      deadline: null,
      description: cheveningCountryDescription(entry.label, url),
      eligibleRegions: ["africa"],
    };
  });
}

function cheveningFellowshipLeafProgrammes() {
  return CHEVENING_FELLOWSHIPS.map((entry) => ({
    externalId: `chevening-fellowship-${entry.slug}`,
    title: entry.title,
    organizationName: "Chevening / UK Government",
    country: entry.country,
    hostCountry: "United Kingdom",
    degreeLevel: entry.degreeLevel,
    fieldOfStudy: "fellowship / professional development",
    fundingType: "fully_funded",
    applicationUrl: entry.url,
    url: entry.url,
    sourceUrl: entry.url,
    applicationStartDate: null,
    applicationEndDate: null,
    deadline: null,
    description: cheveningFellowshipDescription(entry),
    eligibleRegions: entry.eligibleRegions,
  }));
}

function cheveningLeafProgrammes() {
  return [...cheveningCountryLeafProgrammes(), ...cheveningFellowshipLeafProgrammes()];
}

module.exports = {
  CHEVENING_APPLY,
  CHEVENING_AFRICAN_COUNTRIES,
  CHEVENING_FELLOWSHIPS,
  cheveningCountryLeafProgrammes,
  cheveningFellowshipLeafProgrammes,
  cheveningLeafProgrammes,
};
