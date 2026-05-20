const { fetchOfficialPageMetadataWithRetry } = require("./fetchOfficialPageMetadata");
const { inferDegreeLevelFromUrl } = require("../degreeLevel");
const { slugToTitle } = require("./discoverProgrammeLinks");
const {
  isPollutedDescription,
  isLowQualityTitle,
  isListingHubUrl,
} = require("../descriptionQuality");
const { isGovTrustedUrl } = require("../govTrustedDomains");

const MIN_SITE_DESCRIPTION = 120;
const MIN_TRUSTED_DESCRIPTION = 80;

/**
 * Build an import record using only text extracted from the official listing URL.
 * Returns null when the page cannot supply a programme-specific description.
 */
async function buildRecordFromOfficialPage({
  url,
  externalId,
  organizationName,
  country,
  degreeLevel,
  fieldOfStudy = "multiple disciplines",
  fundingType,
  amount,
  titleHint,
  applicationUrl,
  curatedDescription,
  allowTrustedFallback = false,
  fetchOptions = {},
}) {
  if (isListingHubUrl(url)) {
    return null;
  }

  const trusted = isGovTrustedUrl(url);
  const minDescription =
    allowTrustedFallback && trusted ? MIN_TRUSTED_DESCRIPTION : MIN_SITE_DESCRIPTION;

  let page = null;
  try {
    page = await fetchOfficialPageMetadataWithRetry(url, {
      retries: fetchOptions.retries ?? 2,
      timeout: fetchOptions.timeout ?? 35000,
      baseDelayMs: fetchOptions.baseDelayMs ?? 1000,
    });
  } catch {
    page = null;
  }

  let description =
    page?.description && page.description.length >= minDescription && !isPollutedDescription(page.description)
      ? page.description
      : null;
  let descriptionFromSite = Boolean(description && page?.descriptionFromSite);

  if (
    !description &&
    allowTrustedFallback &&
    trusted &&
    curatedDescription &&
    curatedDescription.length >= minDescription &&
    !isPollutedDescription(curatedDescription)
  ) {
    description = curatedDescription.trim();
    descriptionFromSite = true;
  }

  if (!description) {
    return null;
  }

  const slug = url.replace(/\/+$/, "").split("/").pop();
  const title =
    titleHint ||
    (page?.title && page.title.length >= 8 ? page.title : null) ||
    slugToTitle(slug) ||
    null;

  if (!title || isLowQualityTitle(title)) return null;

  return {
    externalId,
    title,
    organizationName,
    country,
    degreeLevel: degreeLevel || inferDegreeLevelFromUrl(url) || "master",
    fieldOfStudy,
    fundingType: page?.fundingType || fundingType || null,
    deadline: page?.deadline || null,
    amount: amount || null,
    description,
    descriptionFromSite,
    applicationUrl: applicationUrl || page?.applicationUrl || url,
    sourceUrl: url,
  };
}

module.exports = {
  buildRecordFromOfficialPage,
  MIN_SITE_DESCRIPTION,
};
