const fs = require("fs");
const path = require("path");

const REGISTRY_PATH = path.join(__dirname, "../../../../data/source-registry.json");

const TIER_KEYS = {
  1: "tier1_official",
  2: "tier2_african",
  3: "tier3_university",
};

const DEFAULT_MAX_LINKS = {
  1: 80,
  2: 60,
  3: 100,
};

function loadRegistryFile(filePath = REGISTRY_PATH) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

/**
 * @param {{ tiers?: number[], hubKey?: string, limitHubs?: number }} options
 */
function listRegistryHubs(options = {}) {
  const data = loadRegistryFile(options.filePath);
  const tierNums = options.tiers || [1, 2, 3];
  const hubs = [];

  for (const tier of tierNums) {
    const key = TIER_KEYS[tier];
    const entries = data[key] || [];
    for (const entry of entries) {
      if (options.hubKey && entry.key !== options.hubKey) continue;
      hubs.push({
        ...entry,
        tier,
        tierKey: key,
        sourceType: tier === 3 ? "university" : tier === 2 ? "ngo" : "government",
        maxLinks: options.maxLinksPerTier?.[tier] ?? DEFAULT_MAX_LINKS[tier] ?? 50,
      });
    }
  }

  hubs.sort((a, b) => (a.crawlPriority || 99) - (b.crawlPriority || 99));
  if (options.limitHubs) return hubs.slice(0, options.limitHubs);
  return hubs;
}

module.exports = {
  REGISTRY_PATH,
  TIER_KEYS,
  DEFAULT_MAX_LINKS,
  loadRegistryFile,
  listRegistryHubs,
};
