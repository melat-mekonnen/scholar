const { env } = require("../../config/env");
const { SOURCE_TYPES, compareSourcesByPriority, priorityForSourceType } = require("./sourceTypes");
const { fetchDaadScholarships } = require("./connectors/daadConnector");
const { fetchErasmusScholarships } = require("./connectors/erasmusConnector");
const { fetchFulbrightScholarships } = require("./connectors/fulbrightConnector");
const { fetchCheveningScholarships } = require("./connectors/cheveningConnector");
const { fetchCommonwealthScholarships } = require("./connectors/commonwealthConnector");
const { fetchFastwebScholarships } = require("./connectors/fastwebConnector");
const { fetchAustraliaAwardsScholarships } = require("./connectors/australiaAwardsConnector");
const { fetchMastercardFoundationScholarships } = require("./connectors/mastercardFoundationConnector");
const { fetchAfricanMinistryScholarships } = require("./connectors/africanMinistryConnector");
const { fetchAfricanUniversityScholarships } = require("./connectors/africanUniversityConnector");
const { fetchAfricanAggregatorScholarships } = require("./connectors/africanAggregatorConnector");
const { fetchAfricanResearchScholarships } = require("./connectors/africanResearchConnector");
const { fetchPhase1CuratedScholarships } = require("./connectors/phase1CuratedConnector");

/** Hand-picked official programme pages (~30); no hub crawl. */
const PHASE1_SOURCE_IDS = ["phase1_curated"];

/** Fast Africa-scale ingest (no DAAD / slow EU crawlers). */
const AFRICA_SCALE_SOURCE_IDS = [
  "african_ministries",
  "african_universities",
  "african_research",
  "african_aggregators",
];

const SOURCES = {
  daad: {
    sourceName: "DAAD",
    sourceType: SOURCE_TYPES.GOVERNMENT,
    enabled: () => env.ingestDaadEnabled,
    fetch: fetchDaadScholarships,
  },
  erasmus: {
    sourceName: "ERASMUS",
    sourceType: SOURCE_TYPES.GOVERNMENT,
    enabled: () => env.ingestErasmusEnabled,
    fetch: fetchErasmusScholarships,
  },
  fulbright: {
    sourceName: "FULBRIGHT",
    sourceType: SOURCE_TYPES.GOVERNMENT,
    enabled: () => env.ingestFulbrightEnabled,
    fetch: fetchFulbrightScholarships,
  },
  chevening: {
    sourceName: "CHEVENING",
    sourceType: SOURCE_TYPES.GOVERNMENT,
    enabled: () => env.ingestCheveningEnabled,
    fetch: fetchCheveningScholarships,
  },
  commonwealth: {
    sourceName: "COMMONWEALTH",
    sourceType: SOURCE_TYPES.GOVERNMENT,
    enabled: () => env.ingestCommonwealthEnabled,
    fetch: fetchCommonwealthScholarships,
  },
  australia_awards: {
    sourceName: "AUSTRALIA_AWARDS",
    sourceType: SOURCE_TYPES.GOVERNMENT,
    enabled: () => env.ingestAustraliaAwardsEnabled,
    fetch: fetchAustraliaAwardsScholarships,
  },
  african_ministries: {
    sourceName: "AFRICAN_MINISTRIES",
    sourceType: SOURCE_TYPES.GOVERNMENT,
    enabled: () => env.ingestAfricanMinistriesEnabled,
    fetch: fetchAfricanMinistryScholarships,
  },
  african_universities: {
    sourceName: "AFRICAN_UNIVERSITIES",
    sourceType: SOURCE_TYPES.UNIVERSITY,
    enabled: () => env.ingestAfricanUniversitiesEnabled,
    fetch: fetchAfricanUniversityScholarships,
  },
  african_research: {
    sourceName: "AFRICAN_RESEARCH",
    sourceType: SOURCE_TYPES.NGO,
    enabled: () => env.ingestAfricanResearchEnabled,
    fetch: fetchAfricanResearchScholarships,
  },
  mastercard_foundation: {
    sourceName: "MASTERCARD_FOUNDATION",
    sourceType: SOURCE_TYPES.NGO,
    enabled: () => env.ingestMastercardFoundationEnabled,
    fetch: fetchMastercardFoundationScholarships,
  },
  african_aggregators: {
    sourceName: "AFRICAN_AGGREGATORS",
    sourceType: SOURCE_TYPES.AGGREGATOR,
    enabled: () => env.ingestAfricanAggregatorsEnabled,
    fetch: fetchAfricanAggregatorScholarships,
  },
  fastweb: {
    sourceName: "FASTWEB",
    sourceType: SOURCE_TYPES.AGGREGATOR,
    enabled: () => env.ingestFastwebEnabled,
    fetch: fetchFastwebScholarships,
  },
  phase1_curated: {
    sourceName: "PHASE1_CURATED",
    sourceType: SOURCE_TYPES.GOVERNMENT,
    enabled: () => true,
    fetch: fetchPhase1CuratedScholarships,
  },
};

function listSources() {
  return Object.keys(SOURCES);
}

function getSourceConfig(source) {
  return SOURCES[source] || null;
}

function listSourceMetadata() {
  return listSources().map((id) => {
    const config = SOURCES[id];
    return {
      id,
      sourceName: config.sourceName,
      sourceType: config.sourceType,
      priority: priorityForSourceType(config.sourceType),
      enabled: typeof config.enabled === "function" ? config.enabled() : true,
    };
  });
}

function getSourceConfigBySourceName(sourceName) {
  const target = String(sourceName || "").toUpperCase();
  return (
    Object.values(SOURCES).find((config) => config.sourceName === target) || null
  );
}

function parseRequestedSources(input) {
  const normalized = String(input || "").trim().toLowerCase();
  if (normalized === "africa" || normalized === "africa_scale") {
    return parseRequestedSources(AFRICA_SCALE_SOURCE_IDS.join(","));
  }
  if (normalized === "phase1" || normalized === "phase1_curated") {
    return PHASE1_SOURCE_IDS;
  }

  const allKeys = listSources();
  const rawKeys =
    !input || input === "all"
      ? allKeys
      : String(input)
          .split(",")
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

  const expandedKeys = [];
  for (const key of rawKeys) {
    if (key === "africa" || key === "africa_scale") {
      expandedKeys.push(...AFRICA_SCALE_SOURCE_IDS);
    } else if (key === "phase1" || key === "phase1_curated") {
      expandedKeys.push(...PHASE1_SOURCE_IDS);
    } else {
      expandedKeys.push(key);
    }
  }

  const keys = [...new Set(expandedKeys)];

  const validKeys = keys.filter((key) => Boolean(SOURCES[key]));

  if (!input || input === "all") {
    const enabledKeys = validKeys.filter((key) => {
      const config = SOURCES[key];
      if (typeof config.enabled === "function") return config.enabled();
      return true;
    });
    return enabledKeys
      .map((id) => ({
        id,
        sourceType: SOURCES[id].sourceType,
        sourceName: SOURCES[id].sourceName,
      }))
      .sort(compareSourcesByPriority)
      .map((entry) => entry.id);
  }

  return validKeys
    .map((id) => ({
      id,
      sourceType: SOURCES[id].sourceType,
      sourceName: SOURCES[id].sourceName,
    }))
    .sort(compareSourcesByPriority)
    .map((entry) => entry.id);
}

module.exports = {
  AFRICA_SCALE_SOURCE_IDS,
  PHASE1_SOURCE_IDS,
  listSources,
  getSourceConfig,
  getSourceConfigBySourceName,
  listSourceMetadata,
  parseRequestedSources,
};
