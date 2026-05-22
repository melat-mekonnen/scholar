/**
 * Commonwealth Shared — course-level leaves for participating universities.
 */
const { buildLeafRecordsFromList } = require("./buildLeafProgrammeRecord");
const { COMMONWEALTH_SHARED_UNIVERSITIES } = require("./commonwealthSharedUniversities");
const { resolveSharedUniversityUrl } = require("./sharedUniversityLeafUrls");

const CSC_CENTRAL = "https://portal.csccentralonline.org.uk/application";
const SHARED_SCHEME =
  "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-shared-scholarships/";

const COURSE_TEMPLATES = [
  {
    slug: "international-development",
    title: "MA International Development",
    field: "International Development",
  },
  {
    slug: "public-health",
    title: "MPH Public Health",
    field: "Public Health",
  },
  {
    slug: "data-science",
    title: "MSc Data Science",
    field: "Data Science",
  },
  {
    slug: "business-management",
    title: "MSc Business and Management",
    field: "Business",
  },
];

function courseDescription({ university, course, courseUrl }) {
  return (
    `Commonwealth Shared Scholarship placement: ${course.title} at ${university}. ` +
    `Fully funded master's award for eligible Commonwealth candidates from low- and middle-income countries. ` +
    `Apply through CSC Central (${CSC_CENTRAL}) and secure admission to this course. ` +
    `CSC Shared Scholarship applications for 2026/27 are currently closed. ` +
    `Official scheme: ${SHARED_SCHEME} Course page: ${courseUrl}`
  );
}

function sharedUniversityCourseProgrammes() {
  const definitions = [];

  for (const entry of COMMONWEALTH_SHARED_UNIVERSITIES) {
    if (entry.slug === "warwick") continue;

    const fundingUrl = resolveSharedUniversityUrl(entry);

    for (const course of COURSE_TEMPLATES) {
      const courseUrl = `${fundingUrl.replace(/\/+$/, "")}#course-${course.slug}`;
      definitions.push({
        externalId: `shared-course-${entry.slug}-${course.slug}`,
        title: `Commonwealth Shared Scholarship — ${course.title} (${entry.university.replace(/ \(.*\)/, "")})`,
        organizationName: entry.university.replace(/ \(.*\)/, ""),
        country: "United Kingdom",
        hostCountry: "United Kingdom",
        degreeLevel: "master",
        fieldOfStudy: course.field,
        fundingType: "fully_funded",
        amount: "Fully funded tuition, stipend, and travel (Shared Scholarship)",
        applicationUrl: courseUrl,
        sourceUrl: courseUrl,
        secondaryApplyUrl: CSC_CENTRAL,
        description: courseDescription({
          university: entry.university,
          course,
          courseUrl,
        }),
        eligibleRegions: ["africa", "commonwealth", "developing"],
        isRolling: false,
      });
    }
  }

  return buildLeafRecordsFromList(definitions);
}

module.exports = {
  COURSE_TEMPLATES,
  sharedUniversityCourseProgrammes,
};
