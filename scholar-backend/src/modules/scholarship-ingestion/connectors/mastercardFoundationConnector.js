const { discoverProgrammeLinks } = require("./discoverProgrammeLinks");
const { buildRecordsFromLinks } = require("./buildProgrammeRecords");
const { buildRecordFromOfficialPage } = require("./officialPageRecord");

const HUB_URL = "https://mastercardfdn.org/all/scholars/";
const EXTRA_URLS = [
  "https://mastercardfdn.org/research/scholars-program/",
  "https://mastercardfoundation.org/scholars/",
];

async function fetchMastercardFoundationScholarships() {
  const links = await discoverProgrammeLinks(HUB_URL, {
    max: 10,
    hostMustInclude: "mastercard",
    extraUrls: EXTRA_URLS,
  });

  const defaults = {
    externalIdPrefix: "mastercard-foundation",
    organizationName: "Mastercard Foundation",
    country: "Canada",
    degreeLevel: "master",
    fundingType: "fully_funded",
  };

  const filtered = links.filter(
    (url) =>
      !/news|blog|press|award/i.test(url) &&
      !/\/scholars\/?$/i.test(url.replace(/\/+$/, "")),
  );

  if (!filtered.length) {
    const record = await buildRecordFromOfficialPage({
      url: "https://mastercardfoundation.org/scholars/",
      externalId: "mastercard-foundation-scholars",
      organizationName: defaults.organizationName,
      country: defaults.country,
      degreeLevel: "master",
      titleHint: "Mastercard Foundation Scholars Program",
    });
    return record ? [record] : [];
  }

  return buildRecordsFromLinks(filtered, defaults);
}

module.exports = { fetchMastercardFoundationScholarships };
