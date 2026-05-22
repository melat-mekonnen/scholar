const { discoverProgrammeLinks } = require("./discoverProgrammeLinks");
const { buildRecordsFromLinks } = require("./buildProgrammeRecords");
const { buildRecordFromOfficialPage } = require("./officialPageRecord");

const HUB_URL = "https://www.australiaawards.gov.au/";
const EXTRA_URLS = [
  "https://www.dfat.gov.au/people-to-people/australia-awards/australia-awards-scholarships",
];

async function fetchAustraliaAwardsScholarships() {
  const links = await discoverProgrammeLinks(HUB_URL, {
    max: 10,
    hostMustInclude: "australiaawards.gov.au",
    extraUrls: EXTRA_URLS,
  });

  const defaults = {
    externalIdPrefix: "australia-awards",
    organizationName: "Australia Awards (DFAT)",
    country: "Australia",
    degreeLevel: "master",
    fundingType: "fully_funded",
  };

  const filtered = links.filter((url) => !/\/apply\/?$/i.test(url.replace(/\/+$/, "")));

  if (!filtered.length) {
    const hub = await buildRecordFromOfficialPage({
      url: HUB_URL,
      externalId: "australia-awards-hub",
      organizationName: defaults.organizationName,
      country: defaults.country,
      degreeLevel: "master",
      titleHint: "Australia Awards Scholarships",
    });
    return hub ? [hub] : [];
  }

  return buildRecordsFromLinks(filtered, defaults);
}

module.exports = { fetchAustraliaAwardsScholarships };
