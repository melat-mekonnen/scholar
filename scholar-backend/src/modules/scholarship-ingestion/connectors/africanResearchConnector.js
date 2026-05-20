const { SOURCE_TYPES } = require("../sourceTypes");
const { fetchFromHubSources } = require("./buildHubConnector");

const RESEARCH_SOURCES = [
  {
    key: "african_academy_sciences",
    hubUrl: "https://aasciences.africa",
    country: "Africa",
    organizationName: "African Academy of Sciences",
    externalIdPrefix: "aas",
    curated: [
      "https://aasciences.africa/programmes",
      "https://aasciences.africa/funding-opportunities",
      "https://aasciences.africa/grants",
    ],
    pathMustInclude: null,
  },
  {
    key: "au_nepad",
    hubUrl: "https://au.int/en/african-union-development-agency-nepad",
    country: "Africa",
    organizationName: "African Union Development Agency (NEPAD)",
    externalIdPrefix: "au-nepad",
    curated: [
      "https://au.int/en/african-union-development-agency-nepad",
      "https://au.int/en/sa/auhp/ctc",
      "https://au.int/en/sa/auhp",
    ],
    pathMustInclude: null,
  },
];

async function fetchAfricanResearchScholarships() {
  return fetchFromHubSources(RESEARCH_SOURCES, SOURCE_TYPES.NGO);
}

module.exports = { fetchAfricanResearchScholarships, RESEARCH_SOURCES };
