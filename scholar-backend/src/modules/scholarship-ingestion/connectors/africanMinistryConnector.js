const { SOURCE_TYPES } = require("../sourceTypes");
const { fetchFromHubSources } = require("./buildHubConnector");
const { programmeUrlsForSource } = require("./africanMinistryProgrammes");

const MINISTRY_SOURCES = [
  {
    key: "ethiopia",
    hubUrl: "https://www.moe.gov.et",
    country: "Ethiopia",
    organizationName: "Ministry of Education — Ethiopia",
    externalIdPrefix: "et-moe",
    curated: [],
    programmeUrls: programmeUrlsForSource("ethiopia"),
    pathMustInclude: "scholarship",
  },
  {
    key: "kenya",
    hubUrl: "https://www.education.go.ke/",
    country: "Kenya",
    organizationName: "Ministry of Education — Kenya",
    externalIdPrefix: "ke-education",
    curated: ["https://www.education.go.ke/index.php/scholarships"],
    programmeUrls: programmeUrlsForSource("kenya"),
    pathMustInclude: "scholarship",
  },
  {
    key: "nigeria",
    hubUrl: "https://education.gov.ng/",
    country: "Nigeria",
    organizationName: "Federal Ministry of Education — Nigeria",
    externalIdPrefix: "ng-education",
    curated: ["https://education.gov.ng/category/scholarships-opportunities/"],
    programmeUrls: programmeUrlsForSource("nigeria"),
    pathMustInclude: "scholarship",
  },
  {
    key: "ghana",
    hubUrl: "https://moe.gov.gh/",
    country: "Ghana",
    organizationName: "Ministry of Education — Ghana",
    externalIdPrefix: "gh-moe",
    curated: ["https://moe.gov.gh/category/scholarships/"],
    programmeUrls: programmeUrlsForSource("ghana"),
    pathMustInclude: "scholarship",
  },
  {
    key: "south_africa",
    hubUrl: "https://www.dhet.gov.za/",
    country: "South Africa",
    organizationName: "Department of Higher Education — South Africa",
    externalIdPrefix: "za-dhet",
    curated: ["https://www.dhet.gov.za/", "https://www.nsfas.org.za/"],
    programmeUrls: programmeUrlsForSource("south_africa"),
    pathMustInclude: null,
  },
];

async function fetchAfricanMinistryScholarships() {
  return fetchFromHubSources(MINISTRY_SOURCES, SOURCE_TYPES.GOVERNMENT);
}

module.exports = { fetchAfricanMinistryScholarships, MINISTRY_SOURCES };
