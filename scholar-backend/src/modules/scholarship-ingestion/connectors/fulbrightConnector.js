const { buildRecordFromOfficialPage } = require("./officialPageRecord");
const {
  FULBRIGHT_FOREIGN_STUDENT_URL,
  FULBRIGHT_FLTA_URL,
  FULBRIGHT_FOREIGN_STUDENT_APPLY_URL,
  FULBRIGHT_FLTA_APPLY_URL,
} = require("../leafProgrammes/fulbrightProgrammeUrls");

const PROGRAMMES = [
  {
    externalId: "fulbright-foreign-student",
    url: FULBRIGHT_FOREIGN_STUDENT_URL,
    applicationUrl: FULBRIGHT_FOREIGN_STUDENT_APPLY_URL,
    organizationName: "Fulbright Program",
    country: "United States",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    titleHint: "Fulbright Foreign Student Program",
  },
  {
    externalId: "fulbright-flta",
    url: FULBRIGHT_FLTA_URL,
    applicationUrl: FULBRIGHT_FLTA_APPLY_URL,
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
