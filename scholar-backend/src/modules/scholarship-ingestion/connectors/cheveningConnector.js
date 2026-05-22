const { buildRecordFromOfficialPage } = require("./officialPageRecord");

const CHEVENING_URL = "https://www.chevening.org/scholarships/";
const CHEVENING_APPLY_URL = "https://www.chevening.org/apply/";

async function fetchCheveningScholarships() {
  const record = await buildRecordFromOfficialPage({
    externalId: "chevening-live-scholarships",
    url: CHEVENING_URL,
    organizationName: "Chevening / UK Government",
    country: "United Kingdom",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    applicationUrl: CHEVENING_APPLY_URL,
    titleHint: "Chevening Scholarships",
  });
  return record ? [record] : [];
}

module.exports = { fetchCheveningScholarships };
