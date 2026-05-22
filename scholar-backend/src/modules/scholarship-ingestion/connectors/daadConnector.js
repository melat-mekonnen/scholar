const { discoverProgrammeLinks } = require("./discoverProgrammeLinks");
const { buildRecordsFromProgrammeList } = require("./buildRecordsFromProgrammeList");
const {
  DAAD_SCHOLARSHIP_DATABASE_HUB,
  DAAD_PROGRAMME_URL_BY_EXTERNAL_ID,
} = require("./daadProgrammeUrls");

/** Curated Africa-relevant and major DAAD programme pages (English site). */
const CURATED_DAAD_PROGRAMMES = [
  {
    externalId: "daad-in-region",
    url: DAAD_PROGRAMME_URL_BY_EXTERNAL_ID["daad-in-region"],
    organizationName: "DAAD",
    country: "Ethiopia",
    degreeLevel: "master",
    fieldOfStudy: "multi-disciplinary",
    fundingType: "fully_funded",
    titleHint: "DAAD In-Country / In-Region Scholarships",
  },
  {
    externalId: "daad-epos",
    url: DAAD_PROGRAMME_URL_BY_EXTERNAL_ID["daad-epos"],
    organizationName: "DAAD",
    country: "Germany",
    degreeLevel: "master",
    fieldOfStudy: "development studies",
    fundingType: "fully_funded",
    titleHint: "DAAD EPOS — Development-Related Postgraduate Courses",
  },
  {
    externalId: "daad-research-grants",
    url: DAAD_PROGRAMME_URL_BY_EXTERNAL_ID["daad-research-grants"],
    organizationName: "DAAD",
    country: "Germany",
    degreeLevel: "phd",
    fieldOfStudy: "multi-disciplinary",
    fundingType: "fully_funded",
    titleHint: "DAAD Research Grants",
  },
  {
    externalId: "daad-study-scholarships",
    url: DAAD_PROGRAMME_URL_BY_EXTERNAL_ID["daad-study-scholarships"],
    organizationName: "DAAD",
    country: "Germany",
    degreeLevel: "master",
    fieldOfStudy: "multi-disciplinary",
    fundingType: "fully_funded",
    titleHint: "DAAD Study Scholarships",
  },
  {
    externalId: "daad-study-stipends",
    url: DAAD_PROGRAMME_URL_BY_EXTERNAL_ID["daad-study-stipends"],
    organizationName: "DAAD",
    country: "Germany",
    degreeLevel: "bachelor",
    fieldOfStudy: "multi-disciplinary",
    fundingType: "fully_funded",
    titleHint: "DAAD University Summer Courses",
  },
  {
    externalId: "daad-graduate-schools",
    url: DAAD_PROGRAMME_URL_BY_EXTERNAL_ID["daad-graduate-schools"],
    organizationName: "DAAD",
    country: "Germany",
    degreeLevel: "phd",
    fieldOfStudy: "multi-disciplinary",
    fundingType: "fully_funded",
    titleHint: "DAAD Doctoral Programmes in Germany",
  },
  {
    externalId: "daad-undergraduate",
    url: DAAD_PROGRAMME_URL_BY_EXTERNAL_ID["daad-undergraduate"],
    organizationName: "DAAD",
    country: "Germany",
    degreeLevel: "bachelor",
    fieldOfStudy: "multi-disciplinary",
    fundingType: "fully_funded",
    titleHint: "Deutschlandstipendium (Germany Scholarship)",
  },
  {
    externalId: "daad-funding-database",
    url: DAAD_SCHOLARSHIP_DATABASE_HUB,
    organizationName: "DAAD",
    country: "Germany",
    degreeLevel: "master",
    fieldOfStudy: "multi-disciplinary",
    fundingType: "fully_funded",
    titleHint: "DAAD Scholarship Database",
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
    discovered = await discoverProgrammeLinks(DAAD_SCHOLARSHIP_DATABASE_HUB, {
      max: 8,
      hostMustInclude: "daad.de",
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
    .slice(0, 4)
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

module.exports = {
  fetchDaadScholarships,
  CURATED_DAAD_PROGRAMMES,
  DAAD_PROGRAMME_URL_BY_EXTERNAL_ID,
  DAAD_SCHOLARSHIP_DATABASE_HUB,
};
