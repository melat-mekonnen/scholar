const { SOURCE_TYPES } = require("../sourceTypes");
const { fetchFromHubSources } = require("./buildHubConnector");

const UNIVERSITY_SOURCES = [
  {
    key: "uon_nairobi",
    hubUrl: "https://www.uonbi.ac.ke",
    country: "Kenya",
    organizationName: "University of Nairobi",
    externalIdPrefix: "ke-uon",
    curated: [
      "https://www.uonbi.ac.ke/funding/scholarships",
      "https://www.uonbi.ac.ke/funding",
      "https://www.uonbi.ac.ke/news/scholarships",
    ],
    pathMustInclude: "scholarship",
  },
  {
    key: "ug_ghana",
    hubUrl: "https://www.ug.edu.gh",
    country: "Ghana",
    organizationName: "University of Ghana",
    externalIdPrefix: "gh-ug",
    curated: [
      "https://www.ug.edu.gh/content/international-scholarships",
      "https://www.ug.edu.gh/news/scholarships",
    ],
    pathMustInclude: "scholarship",
  },
  {
    key: "ucc_ghana",
    hubUrl: "https://www.ucc.edu.gh",
    country: "Ghana",
    organizationName: "University of Cape Coast",
    externalIdPrefix: "gh-ucc",
    curated: [
      "https://www.ucc.edu.gh/scholarships",
      "https://www.ucc.edu.gh/news/scholarships",
    ],
    pathMustInclude: "scholarship",
  },
  {
    key: "ui_nigeria",
    hubUrl: "https://www.ui.edu.ng",
    country: "Nigeria",
    organizationName: "University of Ibadan",
    externalIdPrefix: "ng-ui",
    curated: [
      "https://www.ui.edu.ng/content/scholarships-and-grants",
      "https://www.ui.edu.ng/news/scholarships",
    ],
    pathMustInclude: "scholarship",
  },
  {
    key: "ecsu_ethiopia",
    hubUrl: "https://www.ecsu.edu.et",
    country: "Ethiopia",
    organizationName: "Ethiopian Civil Service University",
    externalIdPrefix: "et-ecsu",
    curated: [
      "https://www.ecsu.edu.et",
      "https://www.ecsu.edu.et/scholarships",
      "https://www.ecsu.edu.et/training-programs",
    ],
    pathMustInclude: null,
  },
  {
    key: "aastu_ethiopia",
    hubUrl: "https://www.aastu.edu.et",
    country: "Ethiopia",
    organizationName: "Addis Ababa Science and Technology University",
    externalIdPrefix: "et-aastu",
    curated: [
      "https://www.aastu.edu.et",
      "https://www.aastu.edu.et/scholarships",
      "https://www.aastu.edu.et/research",
    ],
    pathMustInclude: null,
  },
];

async function fetchAfricanUniversityScholarships() {
  return fetchFromHubSources(UNIVERSITY_SOURCES, SOURCE_TYPES.UNIVERSITY);
}

module.exports = { fetchAfricanUniversityScholarships, UNIVERSITY_SOURCES };
