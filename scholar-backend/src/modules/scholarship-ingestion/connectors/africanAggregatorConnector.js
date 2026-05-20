const { SOURCE_TYPES } = require("../sourceTypes");
const { fetchFromHubSources, DEFAULT_FETCH } = require("./buildHubConnector");

const AGGREGATOR_FETCH = { ...DEFAULT_FETCH, timeout: 22000, retries: 1, baseDelayMs: 500 };

const AGGREGATOR_SOURCES = [
  {
    key: "scholarships_for_development",
    hubUrl: "https://www.scholarshipsfordevelopment.com",
    country: "International",
    organizationName: "Scholarships for Development",
    externalIdPrefix: "sfd",
    curated: [
      "https://www.scholarshipsfordevelopment.com/category/scholarships/",
      "https://www.scholarshipsfordevelopment.com/category/africa/",
      "https://www.scholarshipsfordevelopment.com/category/fellowships/",
    ],
    crawlOptions: { maxLinks: 25 },
  },
  {
    key: "after_school_africa",
    hubUrl: "https://www.afterschoolafrica.com",
    country: "International",
    organizationName: "After School Africa",
    externalIdPrefix: "asa",
    curated: [
      "https://www.afterschoolafrica.com/scholarships/",
      "https://www.afterschoolafrica.com/category/scholarships/",
      "https://www.afterschoolafrica.com/category/fellowships/",
    ],
    crawlOptions: { maxLinks: 25 },
  },
  {
    key: "opportunity_desk",
    hubUrl: "https://opportunitydesk.org",
    country: "International",
    organizationName: "Opportunity Desk",
    externalIdPrefix: "od",
    curated: [
      "https://opportunitydesk.org/category/scholarships/",
      "https://opportunitydesk.org/category/fellowships/",
      "https://opportunitydesk.org/category/grants/",
    ],
    crawlOptions: { maxLinks: 25 },
  },
  {
    key: "opportunity_portal_africa",
    hubUrl: "https://opportunityportal.africa",
    country: "Africa",
    organizationName: "Opportunity Portal Africa",
    externalIdPrefix: "opa",
    curated: [
      "https://opportunityportal.africa/category/scholarships/",
      "https://opportunityportal.africa/category/fellowships/",
      "https://opportunityportal.africa/category/grants/",
    ],
    crawlOptions: { maxLinks: 25 },
  },
];

async function fetchAfricanAggregatorScholarships() {
  return fetchFromHubSources(
    AGGREGATOR_SOURCES,
    SOURCE_TYPES.AGGREGATOR,
    AGGREGATOR_FETCH,
  );
}

module.exports = { fetchAfricanAggregatorScholarships, AGGREGATOR_SOURCES };
