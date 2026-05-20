/**
 * Warwick Commonwealth Shared — course-level leaf records (Phase 3).
 */
const { buildLeafRecordsFromList } = require("./buildLeafProgrammeRecord");

const CSC_CENTRAL = "https://portal.csccentralonline.org.uk/application";
const SHARED_SCHEME =
  "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-shared-scholarships/";

const WARWICK_SHARED_COURSES = [
  {
    slug: "analytical-sciences-instrumentation",
    title: "MSc Analytical Sciences and Instrumentation",
    url: "https://warwick.ac.uk/study/postgraduate/courses/analytical-sciences-instrumentation/",
    field: "Analytical Sciences",
  },
  {
    slug: "arts-enterprise-development",
    title: "MA Arts, Enterprise and Development",
    url: "https://warwick.ac.uk/study/postgraduate/courses/arts-enterprise-development/",
    field: "Arts and Enterprise",
  },
  {
    slug: "humanitarian-engineering",
    title: "MSc Humanitarian Engineering",
    url: "https://warwick.ac.uk/study/postgraduate/courses/humanitarian-engineering/",
    field: "Humanitarian Engineering",
  },
  {
    slug: "international-development-law-human-rights",
    title: "LLM International Development Law and Human Rights",
    url: "https://warwick.ac.uk/study/postgraduate/courses/international-development-law-human-rights/",
    field: "Law",
  },
  {
    slug: "public-health",
    title: "MPH Public Health",
    url: "https://warwick.ac.uk/study/postgraduate/courses/public-health/",
    field: "Public Health",
  },
  {
    slug: "global-sustainable-development",
    title: "MASc Global Sustainable Development",
    url: "https://warwick.ac.uk/study/postgraduate/courses/global-sustainable-development/",
    field: "Sustainable Development",
  },
  {
    slug: "international-development",
    title: "MA International Development",
    url: "https://warwick.ac.uk/study/postgraduate/courses/international-development/",
    field: "International Development",
  },
];

function courseDescription(course) {
  return (
    `Commonwealth Shared Scholarship placement: ${course.title} at University of Warwick (2026/27). ` +
    `This is a fully funded master's award for eligible Commonwealth candidates from low- and middle-income countries. ` +
    `Candidates must apply through CSC Central (${CSC_CENTRAL}) and separately secure admission to this master's course at Warwick. ` +
    `University contact: scholars@warwick.ac.uk. CSC Shared Scholarship applications for 2026/27 are currently closed. ` +
    `Official scheme: ${SHARED_SCHEME} Course page: ${course.url}`
  );
}

function warwickSharedCourseProgrammes() {
  return buildLeafRecordsFromList(
    WARWICK_SHARED_COURSES.map((course) => ({
      externalId: `warwick-shared-${course.slug}`,
      title: `Commonwealth Shared Scholarship — ${course.title} (Warwick)`,
      organizationName: "University of Warwick",
      country: "United Kingdom",
      hostCountry: "United Kingdom",
      degreeLevel: "master",
      fieldOfStudy: course.field,
      fundingType: "fully_funded",
      amount: "Fully funded tuition, stipend, and travel (Shared Scholarship)",
      applicationUrl: course.url,
      sourceUrl: course.url,
      secondaryApplyUrl: CSC_CENTRAL,
      description: courseDescription(course),
      eligibleRegions: ["africa", "commonwealth", "developing"],
      isRolling: false,
    })),
  );
}

module.exports = {
  WARWICK_SHARED_COURSES,
  warwickSharedCourseProgrammes,
};
