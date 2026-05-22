const { inferDegreeLevelFromUrl } = require("../degreeLevel");
const { discoverProgrammeLinks } = require("./discoverProgrammeLinks");
const { buildRecordFromOfficialPage } = require("./officialPageRecord");

const COMMONWEALTH_HUB = "https://cscuk.fcdo.gov.uk/scholarships/";
const COMMONWEALTH_FALLBACK_URL =
  "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-masters-scholarships/";

async function fetchCommonwealthScholarships() {
  const links = await discoverProgrammeLinks(COMMONWEALTH_HUB, {
    max: 12,
    hostMustInclude: "cscuk.fcdo.gov.uk",
    pathPrefix: "/scholarships/",
    extraUrls: [COMMONWEALTH_FALLBACK_URL],
  }).catch(() => [COMMONWEALTH_FALLBACK_URL]);

  const filtered = links.filter(
    (h) =>
      !/\/applications\/?$/i.test(h) &&
      !h.includes("startup-fellowship") &&
      !h.endsWith("/scholarships/") &&
      !/\/archive/i.test(h) &&
      !/\/page\/\d+/i.test(h) &&
      !/\/category\//i.test(h),
  );

  const records = [];
  for (const url of filtered) {
    const slug = url.replace(/\/+$/, "").split("/").pop();
    // eslint-disable-next-line no-await-in-loop
    const record = await buildRecordFromOfficialPage({
      url,
      externalId: `commonwealth-live-${slug || "scholarship"}`,
      organizationName: "Commonwealth Scholarship Commission",
      country: "United Kingdom",
      degreeLevel: inferDegreeLevelFromUrl(url) || "master",
      fieldOfStudy: "multiple disciplines",
      fundingType: "fully_funded",
    });
    if (record) records.push(record);
  }
  return records;
}

module.exports = { fetchCommonwealthScholarships };
