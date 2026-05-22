/** Canonical `scholarships.source_name` for hand-curated leaf catalog rows. */
const CURATED_LEAF_SOURCE = "CURATED_LEAF";

/** Rows discovered by crawling UK university funding hubs. */
const UK_FUNDING_DISCOVERY_SOURCE = "UK_FUNDING_DISCOVERY";

/** US aggregator article discovery resolved to official programme URLs. */
const US_AGGREGATOR_DISCOVERY_SOURCE = "US_AGGREGATOR_DISCOVERY";

/** Legacy values kept for one-time migration / read compatibility. */
const LEGACY_CURATED_LEAF_SOURCE = "PHASE1_CURATED";
const LEGACY_UK_FUNDING_DISCOVERY_SOURCE = "PHASE3_BURSARY";

function curatedLeafSourceNames() {
  return [CURATED_LEAF_SOURCE, LEGACY_CURATED_LEAF_SOURCE];
}

function ukFundingDiscoverySourceNames() {
  return [UK_FUNDING_DISCOVERY_SOURCE, LEGACY_UK_FUNDING_DISCOVERY_SOURCE];
}

function isCuratedLeafSource(sourceName) {
  return curatedLeafSourceNames().includes(String(sourceName || "").toUpperCase());
}

function isUsAggregatorDiscoverySource(sourceName) {
  return String(sourceName || "").toUpperCase() === US_AGGREGATOR_DISCOVERY_SOURCE;
}

module.exports = {
  CURATED_LEAF_SOURCE,
  UK_FUNDING_DISCOVERY_SOURCE,
  US_AGGREGATOR_DISCOVERY_SOURCE,
  LEGACY_CURATED_LEAF_SOURCE,
  LEGACY_UK_FUNDING_DISCOVERY_SOURCE,
  curatedLeafSourceNames,
  ukFundingDiscoverySourceNames,
  isCuratedLeafSource,
  isUsAggregatorDiscoverySource,
};
