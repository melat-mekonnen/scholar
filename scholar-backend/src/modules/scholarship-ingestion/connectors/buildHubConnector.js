const { discoverProgrammeLinks } = require("./discoverProgrammeLinks");
const { discoverListingLinks } = require("./discoverListingLinks");
const { buildRecordsFromProgrammeList } = require("./buildRecordsFromProgrammeList");
const { crawlStrategyFor } = require("../sourceTypes");
const { isListingHubUrl } = require("../descriptionQuality");

const DEFAULT_FETCH = { timeout: 35000, retries: 2, baseDelayMs: 800 };

function programmeFromHub(source, url) {
  const slug = url.replace(/\/+$/, "").split("/").pop() || source.key;
  return {
    externalId: `${source.externalIdPrefix}-${slug}`.slice(0, 120),
    url,
    organizationName: source.organizationName,
    country: source.country,
    degreeLevel: source.degreeLevel || "master",
    fieldOfStudy: source.fieldOfStudy || "multi-disciplinary",
    fundingType: source.fundingType || "fully_funded",
  };
}

function listingSeedsForSource(source) {
  const curated = source.curated || [];
  const seeds = [source.hubUrl, ...curated].filter(Boolean);
  return [...new Set(seeds.filter((url) => isListingHubUrl(url) || url === source.hubUrl))];
}

async function discoverLinksForSource(source, sourceType) {
  const strategy = { ...crawlStrategyFor(sourceType), ...(source.crawlOptions || {}) };
  const seeds = listingSeedsForSource(source);
  const discoverOpts = {
    max: strategy.maxLinks,
    extraUrls: seeds,
    pathMustInclude: source.pathMustInclude ?? strategy.pathMustInclude,
    relaxMatch: strategy.relaxMatch,
    timeout: 35000,
    excludePatterns: [
      /\/page\/\d+/i,
      /\/archive/i,
      ...(source.excludePatterns || []),
    ],
  };

  let links;
  if (strategy.useListingDiscovery) {
    links = await discoverListingLinks(source.hubUrl, discoverOpts).catch(() => []);
  } else {
    links = await discoverProgrammeLinks(source.hubUrl, discoverOpts).catch(() => []);
  }

  return links.filter((url) => !isListingHubUrl(url));
}

function curatedProgrammesForSource(source) {
  const entries = source.programmeUrls || [];
  return entries.map((entry) => ({
    externalId: entry.externalId || programmeFromHub(source, entry.url).externalId,
    url: entry.url,
    organizationName: entry.organizationName || source.organizationName,
    country: source.country,
    degreeLevel: entry.degreeLevel || source.degreeLevel || "master",
    fieldOfStudy: entry.fieldOfStudy || source.fieldOfStudy || "multi-disciplinary",
    fundingType: entry.fundingType || source.fundingType || "fully_funded",
    titleHint: entry.titleHint || null,
  }));
}

async function fetchFromHubSource(source, sourceType, fetchOptions = DEFAULT_FETCH) {
  const strategy = crawlStrategyFor(sourceType);
  const discovered = await discoverLinksForSource(source, sourceType);
  const seen = new Set();
  const programmes = [];

  for (const entry of curatedProgrammesForSource(source)) {
    if (!entry.url || seen.has(entry.url)) continue;
    seen.add(entry.url);
    programmes.push(entry);
  }

  for (const url of discovered) {
    if (seen.has(url)) continue;
    seen.add(url);
    programmes.push(programmeFromHub(source, url));
  }

  return buildRecordsFromProgrammeList(programmes, {
    delayMs: strategy.delayMs,
    fetchOptions,
  });
}

async function fetchFromHubSources(sources, sourceType, fetchOptions = DEFAULT_FETCH) {
  const all = [];
  for (const source of sources) {
    // eslint-disable-next-line no-await-in-loop
    const rows = await fetchFromHubSource(source, sourceType, fetchOptions);
    all.push(...rows);
  }
  return all;
}

module.exports = {
  fetchFromHubSource,
  fetchFromHubSources,
  discoverLinksForSource,
  programmeFromHub,
  DEFAULT_FETCH,
};
