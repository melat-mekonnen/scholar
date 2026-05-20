/**
 * Warwick study programmes (Phase 4) — degree courses open to international students, fees apply.
 */
const { buildLeafRecordsFromList } = require("./buildLeafProgrammeRecord");

const WARWICK_STUDY_PROGRAMMES = [
  {
    slug: "bsc-accounting-finance",
    title: "BSc Accounting and Finance",
    url: "https://warwick.ac.uk/study/undergraduate/courses/bsc-accounting-finance/",
    degreeLevel: "bachelor",
    field: "Accounting and Finance",
    startDate: "2027-09-27",
  },
  {
    slug: "bsc-economics",
    title: "BSc Economics",
    url: "https://warwick.ac.uk/study/undergraduate/courses/bsc-economics/",
    degreeLevel: "bachelor",
    field: "Economics",
    startDate: "2027-09-27",
  },
  {
    slug: "bsc-computer-science",
    title: "BSc Computer Science",
    url: "https://warwick.ac.uk/study/undergraduate/courses/bsc-computer-science/",
    degreeLevel: "bachelor",
    field: "Computer Science",
    startDate: "2027-09-27",
  },
  {
    slug: "bsc-mathematics",
    title: "BSc Mathematics",
    url: "https://warwick.ac.uk/study/undergraduate/courses/bsc-mathematics/",
    degreeLevel: "bachelor",
    field: "Mathematics",
    startDate: "2027-09-27",
  },
  {
    slug: "bsc-physics",
    title: "BSc Physics",
    url: "https://warwick.ac.uk/study/undergraduate/courses/bsc-physics/",
    degreeLevel: "bachelor",
    field: "Physics",
    startDate: "2027-09-27",
  },
  {
    slug: "msc-data-analytics",
    title: "MSc Data Analytics",
    url: "https://warwick.ac.uk/study/postgraduate/courses/data-analytics/",
    degreeLevel: "master",
    field: "Data Analytics",
    startDate: "2027-09-27",
  },
  {
    slug: "msc-cyber-security-management",
    title: "MSc Cyber Security Management",
    url: "https://warwick.ac.uk/study/postgraduate/courses/cyber-security-management/",
    degreeLevel: "master",
    field: "Cyber Security",
    startDate: "2027-09-27",
  },
];

function programmeDescription(entry) {
  const level = entry.degreeLevel === "bachelor" ? "undergraduate" : "postgraduate";
  return (
    `${entry.title} at University of Warwick (${level}, ${entry.startDate ? `starts ${entry.startDate}` : "September intake"}). ` +
    `This is a degree programme open to international applicants; tuition fees apply (not a funded scholarship listing). ` +
    `Use the official course page to review entry requirements, fees, and how to apply for admission. ` +
    `International students may also explore separate scholarship listings linked to Warwick. Course page: ${entry.url}`
  );
}

function warwickStudyProgrammeRecords() {
  return WARWICK_STUDY_PROGRAMMES.map((entry) => ({
    externalId: `warwick-programme-${entry.slug}`,
    title: entry.title,
    organizationName: "University of Warwick",
    country: "United Kingdom",
    hostCountry: "United Kingdom",
    degreeLevel: entry.degreeLevel,
    fieldOfStudy: entry.field,
    fundingType: "not_funded",
    programmeStartDate: entry.startDate,
    applicationUrl: entry.url,
    sourceUrl: entry.url,
    description: programmeDescription(entry),
    isRolling: true,
  }));
}

function warwickStudyProgrammeLeafRecords() {
  return buildLeafRecordsFromList(
    warwickStudyProgrammeRecords().map((p) => ({
      ...p,
      recordType: "study_programme",
    })),
  );
}

module.exports = {
  WARWICK_STUDY_PROGRAMMES,
  warwickStudyProgrammeRecords,
  warwickStudyProgrammeLeafRecords,
};
