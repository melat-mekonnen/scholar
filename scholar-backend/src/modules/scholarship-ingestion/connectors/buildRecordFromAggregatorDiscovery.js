const { fetchHubHtml } = require("./discoverProgrammeLinks");
const { buildRecordFromOfficialPage } = require("./officialPageRecord");
const { resolveOfficialProgrammeUrl } = require("./resolveOfficialProgrammeUrl");
const { hostnameFromUrl } = require("../govTrustedDomains");

/**
 * Discovery-only path: read an aggregator article, resolve an official programme URL,
 * then build the import row from the official page (never the aggregator URL).
 */
async function buildRecordFromAggregatorDiscovery({
  articleUrl,
  externalId,
  discoverySource,
  organizationName,
  country = "United States",
  degreeLevel,
  fieldOfStudy,
  fundingType,
  titleHint,
  fetchOptions = {},
}) {
  if (!articleUrl || !discoverySource) return null;

  let html = "";
  try {
    html = await fetchHubHtml(articleUrl, fetchOptions.timeout ?? 22000);
  } catch {
    return null;
  }

  const resolved = resolveOfficialProgrammeUrl(html, articleUrl);
  if (!resolved?.url) {
    return null;
  }

  const record = await buildRecordFromOfficialPage({
    url: resolved.url,
    externalId,
    organizationName,
    country,
    degreeLevel,
    fieldOfStudy,
    fundingType,
    titleHint,
    fetchOptions,
  });

  if (!record) return null;

  return {
    ...record,
    extractedFacts: {
      discoveryPhase: "us_aggregator_discovery_v1",
      discoverySource,
      discoverySourceDomain: hostnameFromUrl(articleUrl),
      discoveryArticleUrl: articleUrl,
      resolvedOfficialUrl: resolved.url,
      resolvedOfficialScore: resolved.score,
      resolvedLinkText: resolved.linkText,
    },
  };
}

module.exports = { buildRecordFromAggregatorDiscovery };
