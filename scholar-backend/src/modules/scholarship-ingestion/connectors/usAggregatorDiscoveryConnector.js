const { programmeFromHub, DEFAULT_FETCH } = require("./buildHubConnector");
const { discoverUsAggregatorArticles } = require("./discoverUsAggregatorArticles");
const { buildRecordFromAggregatorDiscovery } = require("./buildRecordFromAggregatorDiscovery");

const DISCOVERY_FETCH = { ...DEFAULT_FETCH, timeout: 22000, retries: 1, baseDelayMs: 600 };
const ARTICLE_DELAY_MS = 500;

/** Blocklisted aggregator domains — discovery only; rows publish as needs_review. */
const US_AGGREGATOR_SOURCES = [
  {
    key: "scholarship_tab",
    hubUrl: "https://www.scholarshiptab.com",
    country: "United States",
    organizationName: "ScholarshipTab",
    externalIdPrefix: "stab",
    curated: [
      "https://www.scholarshiptab.com/category/scholarships/",
      "https://www.scholarshiptab.com/category/fully-funded/",
      "https://www.scholarshiptab.com/category/international-students/",
    ],
    crawlOptions: { maxLinks: 12 },
  },
  {
    key: "us_scholarships",
    hubUrl: "https://www.uscholarships.us",
    country: "United States",
    organizationName: "US Scholarships",
    externalIdPrefix: "uscs",
    curated: [
      "https://www.uscholarships.us/african-students",
      "https://www.uscholarships.us/fully-funded",
      "https://www.uscholarships.us/masters",
      "https://www.uscholarships.us/fellowship",
      "https://www.uscholarships.us/undergraduate",
    ],
    crawlOptions: { maxLinks: 15 },
  },
  {
    key: "scholarship_union",
    hubUrl: "https://scholarshipunion.com",
    country: "United States",
    organizationName: "Scholarship Union",
    externalIdPrefix: "sunion",
    curated: [
      "https://scholarshipunion.com/scholarships-list/",
      "https://scholarshipunion.com/category/study-levels/master-scholarships/",
      "https://scholarshipunion.com/category/funding/fully-funded-scholarships/",
    ],
    crawlOptions: { maxLinks: 15 },
  },
];

async function fetchUsAggregatorDiscoveryScholarships() {
  const records = [];
  const seenArticles = new Set();

  for (const source of US_AGGREGATOR_SOURCES) {
    // eslint-disable-next-line no-await-in-loop
    const articleUrls = await discoverUsAggregatorArticles(source);

    for (const articleUrl of articleUrls) {
      if (!articleUrl || seenArticles.has(articleUrl)) continue;
      seenArticles.add(articleUrl);

      const programme = programmeFromHub(source, articleUrl);
      // eslint-disable-next-line no-await-in-loop
      const record = await buildRecordFromAggregatorDiscovery({
        articleUrl,
        externalId: programme.externalId,
        discoverySource: source.key,
        organizationName: source.organizationName,
        country: source.country,
        degreeLevel: programme.degreeLevel,
        fieldOfStudy: programme.fieldOfStudy,
        fundingType: programme.fundingType,
        fetchOptions: DISCOVERY_FETCH,
      });

      if (record) {
        records.push(record);
      } else if (process.env.NODE_ENV !== "test") {
        // eslint-disable-next-line no-console
        console.warn("[us-aggregator-discovery] skip (no official url):", articleUrl);
      }

      if (ARTICLE_DELAY_MS > 0) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, ARTICLE_DELAY_MS));
      }
    }
  }

  return records;
}

module.exports = {
  fetchUsAggregatorDiscoveryScholarships,
  US_AGGREGATOR_SOURCES,
};
