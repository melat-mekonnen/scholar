const { buildRecordFromOfficialPage } = require("./officialPageRecord");

const PROGRAMMES = [
  {
    externalId: "fulbright-foreign-student",
    url: "https://foreign.fulbrightonline.org/apply",
    organizationName: "Fulbright Program",
    country: "United States",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    titleHint: "Fulbright Foreign Student Program",
  },
  {
    externalId: "fulbright-flta",
    url: "https://foreign.fulbrightonline.org/",
    organizationName: "Fulbright Program",
    country: "United States",
    degreeLevel: "bachelor",
    fieldOfStudy: "language teaching",
    titleHint: "Fulbright FLTA Program",
  },
];

async function fetchFulbrightScholarships() {
  const records = [];
  for (const programme of PROGRAMMES) {
    // eslint-disable-next-line no-await-in-loop
    const record = await buildRecordFromOfficialPage(programme);
    if (record) records.push(record);
  }
  return records;
}

module.exports = { fetchFulbrightScholarships };
