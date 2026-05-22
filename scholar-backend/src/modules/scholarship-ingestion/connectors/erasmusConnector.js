const { buildRecordFromOfficialPage } = require("./officialPageRecord");

const PROGRAMMES = [
  {
    externalId: "erasmus-mundus-joint-masters",
    url: "https://www.eacea.ec.europa.eu/scholarships/emjmd-catalogue_en",
    organizationName: "European Union (Erasmus+)",
    country: "Multiple countries",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    titleHint: "Erasmus Mundus Joint Masters",
  },
  {
    externalId: "erasmus-study-abroad-mobility",
    url: "https://erasmus-plus.ec.europa.eu/opportunities/opportunities-for-individuals/students/studying-abroad",
    organizationName: "European Union (Erasmus+)",
    country: "Multiple countries",
    degreeLevel: "bachelor",
    fieldOfStudy: "multiple disciplines",
    titleHint: "Erasmus+ Study Abroad",
  },
];

async function fetchErasmusScholarships() {
  const records = [];
  for (const programme of PROGRAMMES) {
    // eslint-disable-next-line no-await-in-loop
    const record = await buildRecordFromOfficialPage(programme);
    if (record) records.push(record);
  }
  return records;
}

module.exports = { fetchErasmusScholarships };
