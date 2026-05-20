/**
 * Source taxonomy and crawl priorities for scholarship ingestion.
 * Lower priority number = higher trust / ingest first.
 */
const SOURCE_TYPES = {
  GOVERNMENT: "government",
  UNIVERSITY: "university",
  NGO: "ngo",
  AGGREGATOR: "aggregator",
};

const SOURCE_TYPE_PRIORITY = {
  [SOURCE_TYPES.GOVERNMENT]: 1,
  [SOURCE_TYPES.UNIVERSITY]: 2,
  [SOURCE_TYPES.NGO]: 3,
  [SOURCE_TYPES.AGGREGATOR]: 4,
};

/** Default crawl behaviour keyed by source type. */
const CRAWL_STRATEGIES = {
  [SOURCE_TYPES.GOVERNMENT]: {
    maxLinks: 10,
    delayMs: 400,
    pathMustInclude: null,
    relaxMatch: false,
    includePdfLinks: true,
  },
  [SOURCE_TYPES.UNIVERSITY]: {
    maxLinks: 12,
    delayMs: 350,
    pathMustInclude: null,
    relaxMatch: true,
    includePdfLinks: false,
  },
  [SOURCE_TYPES.NGO]: {
    maxLinks: 10,
    delayMs: 400,
    pathMustInclude: null,
    relaxMatch: true,
    includePdfLinks: false,
  },
  [SOURCE_TYPES.AGGREGATOR]: {
    maxLinks: 20,
    delayMs: 300,
    pathMustInclude: null,
    relaxMatch: true,
    includePdfLinks: false,
    useListingDiscovery: true,
  },
};

function priorityForSourceType(sourceType) {
  return SOURCE_TYPE_PRIORITY[sourceType] ?? 99;
}

function crawlStrategyFor(sourceType) {
  return CRAWL_STRATEGIES[sourceType] || CRAWL_STRATEGIES[SOURCE_TYPES.NGO];
}

function compareSourcesByPriority(a, b) {
  const pa = priorityForSourceType(a.sourceType);
  const pb = priorityForSourceType(b.sourceType);
  if (pa !== pb) return pa - pb;
  return String(a.id || a.sourceName || "").localeCompare(String(b.id || b.sourceName || ""));
}

module.exports = {
  SOURCE_TYPES,
  SOURCE_TYPE_PRIORITY,
  CRAWL_STRATEGIES,
  priorityForSourceType,
  crawlStrategyFor,
  compareSourcesByPriority,
};
