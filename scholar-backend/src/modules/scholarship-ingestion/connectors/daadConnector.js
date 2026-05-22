const { discoverProgrammeLinks } = require("./discoverProgrammeLinks");
const { buildRecordsFromProgrammeList } = require("./buildRecordsFromProgrammeList");

const DAAD_BASE = "https://www.daad.de/en/study-and-research-in-germany/scholarships";
const DAAD_HUB = `${DAAD_BASE}/daad-scholarships/`;

/** Curated Africa-relevant and major DAAD programme pages (English site). */
const CURATED_DAAD_PROGRAMMES = [
  {
    externalId: "daad-in-region",
    url: `${DAAD_HUB}in-region-scholarships/`,
    organizationName: "DAAD",
    country: "Ethiopia",
    degreeLevel: "master",
    fieldOfStudy: "multi-disciplinary",
    fundingType: "fully_funded",
    titleHint: "DAAD In-Country / In-Region Scholarships",
  },
  {
    externalId: "daad-epos",
    url: `${DAAD_HUB}development-related-postgraduate-courses-epos/`,
    organizationName: "DAAD",
    country: "Germany",
    degreeLevel: "master",
    fieldOfStudy: "development studies",
    fundingType: "fully_funded",
    titleHint: "DAAD EPOS — Development-Related Postgraduate Courses",
  },
  {
    externalId: "daad-research-grants",
    url: `${DAAD_HUB}research-grants/`,
    organizationName: "DAAD",
    country: "Germany",
    degreeLevel: "phd",
    fieldOfStudy: "multi-disciplinary",
    fundingType: "fully_funded",
    titleHint: "DAAD Research Grants",
  },
  {
    externalId: "daad-study-scholarships",
    url: `${DAAD_HUB}study-scholarships/`,
    organizationName: "DAAD",
    country: "Germany",
    degreeLevel: "master",
    fieldOfStudy: "multi-disciplinary",
    fundingType: "fully_funded",
    titleHint: "DAAD Study Scholarships",
  },
  {
    externalId: "daad-study-stipends",
    url: `${DAAD_HUB}study-stipends/`,
    organizationName: "DAAD",
    country: "Germany",
    degreeLevel: "bachelor",
    fieldOfStudy: "multi-disciplinary",
    fundingType: "fully_funded",
    titleHint: "DAAD Study Stipends",
  },
  {
    externalId: "daad-graduate-schools",
    url: `${DAAD_HUB}graduate-schools/`,
    organizationName: "DAAD",
    country: "Germany",
    degreeLevel: "phd",
    fieldOfStudy: "multi-disciplinary",
    fundingType: "fully_funded",
    titleHint: "DAAD Graduate Schools",
  },
  {
    externalId: "daad-undergraduate",
    url: `${DAAD_HUB}undergraduate-scholarships/`,
    organizationName: "DAAD",
    country: "Germany",
    degreeLevel: "bachelor",
    fieldOfStudy: "multi-disciplinary",
    fundingType: "fully_funded",
    titleHint: "DAAD Undergraduate Scholarships",
  },
  {
    externalId: "daad-funding-database",
    url: `${DAAD_BASE}/database-of-international-programmes/`,
    organizationName: "DAAD",
    country: "Germany",
    degreeLevel: "master",
    fieldOfStudy: "multi-disciplinary",
    fundingType: "fully_funded",
    titleHint: "DAAD Scholarship Database — International Programmes",
  },
];

const DAAD_FETCH = { timeout: 45000, retries: 2, baseDelayMs: 1200 };

function programmeFromUrl(url) {
  const slug = url.replace(/\/+$/, "").split("/").pop() || "programme";
  return {
    externalId: `daad-discovered-${slug}`.slice(0, 120),
    url,
    organizationName: "DAAD",
    country: url.toLowerCase().includes("in-region") ? "Ethiopia" : "Germany",
    degreeLevel: url.toLowerCase().includes("phd") || url.includes("research") ? "phd" : "master",
    fieldOfStudy: "multi-disciplinary",
    fundingType: "fully_funded",
  };
}

async function fetchDaadScholarships() {
  let discovered = [];
  try {
    discovered = await discoverProgrammeLinks(DAAD_HUB, {
      max: 12,
      hostMustInclude: "daad.de",
      pathMustInclude: "/scholarships/daad-scholarships/",
      relaxMatch: true,
      timeout: 25000,
      extraUrls: CURATED_DAAD_PROGRAMMES.map((p) => p.url),
    });
  } catch {
    discovered = CURATED_DAAD_PROGRAMMES.map((p) => p.url);
  }

  const curatedUrls = new Set(CURATED_DAAD_PROGRAMMES.map((p) => p.url.replace(/\/+$/, "")));
  const discoveredOnly = discovered
    .filter((url) => !curatedUrls.has(url.replace(/\/+$/, "")))
    .slice(0, 6)
    .map(programmeFromUrl);

  const curatedRecords = await buildRecordsFromProgrammeList(CURATED_DAAD_PROGRAMMES, {
    delayMs: 300,
    fetchOptions: DAAD_FETCH,
  });

  const discoveredRecords =
    curatedRecords.length > 0
      ? []
      : await buildRecordsFromProgrammeList(discoveredOnly, {
          delayMs: 300,
          fetchOptions: DAAD_FETCH,
        });

  const byUrl = new Map();
  for (const record of [...curatedRecords, ...discoveredRecords]) {
    const key = (record.sourceUrl || "").replace(/\/+$/, "");
    if (key && !byUrl.has(key)) byUrl.set(key, record);
  }

  return [...byUrl.values()];
}

module.exports = { fetchDaadScholarships, CURATED_DAAD_PROGRAMMES, DAAD_HUB };
