/**
 * Discover programme URLs from aggregator hubs and merge into data/scholarship-urls.txt.
 *
 * Usage:
 *   node scripts/discover-aggregator-urls.js
 *   node scripts/discover-aggregator-urls.js --max=600 --out=data/scholarship-urls.txt
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { AGGREGATOR_SOURCES } = require("../src/modules/scholarship-ingestion/connectors/africanAggregatorConnector");
const { discoverListingLinks } = require("../src/modules/scholarship-ingestion/connectors/discoverListingLinks");
const { discoverProgrammeLinks } = require("../src/modules/scholarship-ingestion/connectors/discoverProgrammeLinks");
const { crawlStrategyFor, SOURCE_TYPES } = require("../src/modules/scholarship-ingestion/sourceTypes");
const { isListingHubUrl, isBareHomepageUrl } = require("../src/modules/scholarship-ingestion/descriptionQuality");

function parseArg(name, fallback) {
  const arg = process.argv.find((part) => part.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : fallback;
}

function normalizeUrlKey(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    u.search = "";
    let p = u.pathname.replace(/\/+$/, "");
    if (!p) p = "/";
    return `${u.protocol}//${u.host.toLowerCase()}${p}`.toLowerCase();
  } catch {
    return null;
  }
}

function isImportableUrl(url) {
  if (!/^https?:\/\//i.test(url)) return false;
  if (isBareHomepageUrl(url) || isListingHubUrl(url)) return false;
  if (/\/advertise|\/wp-admin|\/login|\/register\b/i.test(url)) return false;
  return true;
}

async function discoverUrlsForSource(source, maxPerHub) {
  const strategy = {
    ...crawlStrategyFor(SOURCE_TYPES.AGGREGATOR),
    ...(source.crawlOptions || {}),
    maxLinks: maxPerHub,
  };
  const seeds = [source.hubUrl, ...(source.curated || [])].filter(Boolean);
  const discoverOpts = {
    max: maxPerHub,
    extraUrls: seeds,
    relaxMatch: strategy.relaxMatch,
    timeout: 30000,
    excludePatterns: [/\/archive/i, ...(source.excludePatterns || [])],
  };

  let links = [];
  if (strategy.useListingDiscovery) {
    links = await discoverListingLinks(source.hubUrl, discoverOpts).catch(() => []);
  } else {
    links = await discoverProgrammeLinks(source.hubUrl, discoverOpts).catch(() => []);
  }
  return links.filter((url) => isImportableUrl(url));
}

async function main() {
  const maxPerHub = Number(parseArg("max", "600")) || 600;
  const outFile = path.join(__dirname, "..", parseArg("out", "data/scholarship-urls.txt"));

  const existing = new Set();
  if (fs.existsSync(outFile)) {
    for (const line of fs.readFileSync(outFile, "utf8").split(/\r?\n/)) {
      const key = normalizeUrlKey(line.trim());
      if (key) existing.add(key);
    }
  }

  const discovered = new Set();
  const byHub = {};

  for (const source of AGGREGATOR_SOURCES) {
    // eslint-disable-next-line no-console
    console.log(`Discovering: ${source.key} (${source.hubUrl})...`);
    // eslint-disable-next-line no-await-in-loop
    const urls = await discoverUrlsForSource(source, maxPerHub);
    let added = 0;
    for (const url of urls) {
      const key = normalizeUrlKey(url);
      if (!key || existing.has(key) || discovered.has(key)) continue;
      discovered.add(key);
      added += 1;
    }
    byHub[source.key] = { found: urls.length, newUnique: added };
    // eslint-disable-next-line no-console
    console.log(`  → ${urls.length} candidates, ${added} new unique`);
  }

  const merged = [
    ...fs.existsSync(outFile) ? fs.readFileSync(outFile, "utf8").split(/\r?\n/).filter(Boolean) : [],
    ...[...discovered].sort(),
  ];
  const deduped = [];
  const seen = new Set();
  for (const line of merged) {
    const key = normalizeUrlKey(line.trim());
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(line.trim().startsWith("http") ? line.trim() : `https://${line.trim()}`);
  }

  fs.writeFileSync(outFile, `${deduped.join("\n")}\n`, "utf8");

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        outFile,
        previousCount: existing.size,
        newDiscovered: discovered.size,
        totalLines: deduped.length,
        byHub,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
