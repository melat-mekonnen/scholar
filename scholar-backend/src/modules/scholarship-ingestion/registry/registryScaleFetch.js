const crypto = require("crypto");
const axios = require("axios");
const { discoverProgrammeLinks } = require("../connectors/discoverProgrammeLinks");
const { buildRecordFromOfficialPage } = require("../connectors/officialPageRecord");
const { normalizeScholarshipRecord } = require("../normalizeScholarship");
const { classifyScholarshipRecord } = require("../scholarshipClassifier");
const { assessQualityGate } = require("../qualityGate");
const { isBareHomepageUrl, isListingHubUrl } = require("../descriptionQuality");
const { normalizeUrl } = require("../urlNormalize");
const { listRegistryHubs } = require("./loadSourceRegistry");

const SOURCE_NAME = "REGISTRY_SCALE";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function normalizeUrlKey(url) {
  return normalizeUrl(url);
}

function isExpiredDeadline(deadline, isRolling) {
  if (isRolling) return false;
  if (!deadline) return false;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

async function quickUrlAlive(url) {
  try {
    const res = await axios.get(url, {
      headers: BROWSER_HEADERS,
      timeout: 18000,
      maxRedirects: 5,
      validateStatus: () => true,
      responseType: "text",
      transformResponse: [(d) => d],
    });
    if (res.status === 404 || res.status === 410) return false;
    if (res.status >= 200 && res.status < 400) return true;
    return null;
  } catch (err) {
    if (err.code === "ENOTFOUND" || err.code === "ECONNREFUSED") return false;
    return null;
  }
}

function hubToProgrammeEntries(hub, links) {
  return links.map((url) => ({
    externalId: `reg-${hub.tier}-${hub.key}-${crypto.createHash("sha1").update(normalizeUrlKey(url)).digest("hex").slice(0, 14)}`,
    url,
    organizationName: hub.organizationName,
    country: hub.country,
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: null,
  }));
}

async function discoverHubProgrammes(hub, globalSeen) {
  const seeds = [hub.hubUrl, ...(hub.curated || [])].filter(Boolean);
  const links = await discoverProgrammeLinks(hub.hubUrl, {
    max: hub.maxLinks,
    extraUrls: seeds,
    pathMustInclude: hub.pathMustInclude ?? null,
    relaxMatch: hub.sourceType === "university" || hub.tier === 1,
    timeout: 35000,
    excludePatterns: hub.excludePatterns || [],
  });

  const out = [];
  for (const url of links) {
    const key = normalizeUrlKey(url);
    if (!key || globalSeen.has(key)) continue;
    if (isBareHomepageUrl(url) || isListingHubUrl(url)) continue;
    globalSeen.add(key);
    out.push(url);
  }
  return out;
}

/**
 * Fetch and validate programmes from registry hubs.
 * @returns {Promise<{ records: object[], stats: object, discoveredUrls: string[] }>}
 */
async function fetchRegistryScaleBatch(options = {}) {
  const hubs = listRegistryHubs({
    tiers: options.tiers || [1, 2, 3],
    hubKey: options.hubKey,
    limitHubs: options.limitHubs,
    maxLinksPerTier: options.maxLinksPerTier,
    filePath: options.filePath,
  });

  const globalSeen = new Set();
  const applySeen = new Set();
  const records = [];
  const discoveredUrls = [];
  const stats = {
    hubs: hubs.length,
    linksDiscovered: 0,
    fetched: 0,
    upsertCandidates: 0,
    skipped: {},
  };

  const skip = (reason) => {
    stats.skipped[reason] = (stats.skipped[reason] || 0) + 1;
  };

  for (const hub of hubs) {
    // eslint-disable-next-line no-console
    console.log(`[scale] hub start tier=${hub.tier} key=${hub.key} maxLinks=${hub.maxLinks}`);
    // eslint-disable-next-line no-await-in-loop
    const links = await discoverHubProgrammes(hub, globalSeen);
    stats.linksDiscovered += links.length;
    discoveredUrls.push(...links);
    // eslint-disable-next-line no-console
    console.log(`[scale] hub done key=${hub.key} links=${links.length} candidates=${stats.upsertCandidates}`);

    const programmes = hubToProgrammeEntries(hub, links);
    for (const programme of programmes) {
      // eslint-disable-next-line no-await-in-loop
      const raw = await buildRecordFromOfficialPage({
        ...programme,
        allowTrustedFallback: hub.tier === 1 || hub.sourceType === "government",
        fetchOptions: {
          timeout: options.fetchTimeout ?? 28000,
          retries: options.fetchRetries ?? 1,
          baseDelayMs: options.fetchRetryDelay ?? 600,
        },
      });
      stats.fetched += 1;

      if (!raw) {
        skip("fetch_no_description");
        continue;
      }

      const normalized = normalizeScholarshipRecord({ ...raw, sourceName: SOURCE_NAME });
      if (classifyScholarshipRecord(normalized).reject) {
        skip("classifier_reject");
        continue;
      }

      const applyUrl = normalized.applicationUrl || normalized.sourceUrl;
      if (!applyUrl || isBareHomepageUrl(applyUrl) || isListingHubUrl(applyUrl)) {
        skip("invalid_apply_url");
        continue;
      }

      const applyKey = normalizeUrlKey(applyUrl);
      if (applySeen.has(applyKey)) {
        skip("duplicate_apply_url");
        continue;
      }

      if (options.checkAlive !== false) {
        // eslint-disable-next-line no-await-in-loop
        const alive = await quickUrlAlive(applyUrl);
        if (alive === false) {
          skip("apply_url_dead");
          continue;
        }
      }

      const gate = assessQualityGate(normalized, { sourceName: SOURCE_NAME });
      if (isExpiredDeadline(normalized.deadline, gate.isRolling)) {
        skip("deadline_expired");
        continue;
      }
      if (!gate.isRolling && !normalized.deadline && gate.tier !== "government_trusted") {
        skip("no_deadline_or_rolling");
        continue;
      }

      applySeen.add(applyKey);
      stats.upsertCandidates += 1;
      records.push({
        normalized: {
          ...normalized,
          applicationUrl: applyUrl,
          sourceUrl: normalized.sourceUrl || applyUrl,
          isRolling: gate.isRolling,
          eligibleRegions: gate.eligibleRegions,
          hostCountry: gate.hostCountry,
          country: gate.country || normalized.country,
          ingestionTier: gate.tier,
          qualityScore: gate.qualityScore,
        },
        gate,
        hubKey: hub.key,
        tier: hub.tier,
      });

      if (options.delayMs > 0) {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, options.delayMs));
      }

      if (stats.fetched % 25 === 0) {
        // eslint-disable-next-line no-console
        console.log(`[scale] progress fetched=${stats.fetched} upsertCandidates=${stats.upsertCandidates}`);
      }
    }
  }

  return { records, stats, discoveredUrls, hubs: hubs.map((h) => h.key) };
}

module.exports = {
  SOURCE_NAME,
  fetchRegistryScaleBatch,
  normalizeUrlKey,
  isExpiredDeadline,
};
