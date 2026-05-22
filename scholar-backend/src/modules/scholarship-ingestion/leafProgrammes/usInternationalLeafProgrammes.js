/**
 * Curated official U.S. scholarship programmes for international students.
 * Leaf-level programme + application pages only — no general financial-aid hubs.
 * Phase 1 (quality-first): government exchanges + named awards with official apply paths.
 */

const {
  FULBRIGHT_FOREIGN_STUDENT_URL,
  FULBRIGHT_FLTA_URL,
  FULBRIGHT_FOREIGN_STUDENT_APPLY_URL,
  FULBRIGHT_FLTA_APPLY_URL,
} = require("./fulbrightProgrammeUrls");

const US_ELIGIBLE_REGIONS = ["international", "africa", "developing"];

const US_INTERNATIONAL_PROGRAMMES = [
  {
    externalId: "fulbright-foreign-student",
    title: "Fulbright Foreign Student Program",
    organizationName: "Fulbright Program / U.S. Department of State",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    url: FULBRIGHT_FOREIGN_STUDENT_URL,
    applicationUrl: FULBRIGHT_FOREIGN_STUDENT_APPLY_URL,
    description:
      "The Fulbright Foreign Student Program enables graduate students, young professionals, and artists from abroad to study and conduct research in the United States. Approximately 4,000 grants are awarded annually for master's and doctoral study; applications are submitted through the Fulbright Commission or U.S. Embassy in the applicant's home country.",
    eligibleRegions: US_ELIGIBLE_REGIONS,
  },
  {
    externalId: "fulbright-flta",
    title: "Fulbright Foreign Language Teaching Assistant (FLTA) Program",
    organizationName: "Fulbright Program / U.S. Department of State",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "bachelor",
    fieldOfStudy: "language teaching",
    fundingType: "fully_funded",
    url: FULBRIGHT_FLTA_URL,
    applicationUrl: FULBRIGHT_FLTA_APPLY_URL,
    description:
      "The Fulbright FLTA Program places early-career teachers of English or foreign languages as teaching assistants at U.S. colleges and universities for one academic year. Participants improve their teaching skills while sharing language and culture; nominations are made through U.S. Embassies or Fulbright Commissions abroad.",
    eligibleRegions: US_ELIGIBLE_REGIONS,
  },
  {
    externalId: "knight-hennessy-scholars",
    title: "Knight-Hennessy Scholars — Stanford University",
    organizationName: "Stanford University / Knight-Hennessy Scholars",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    url: "https://knight-hennessy.stanford.edu/admission/preparing-your-applications/online-application",
    applicationUrl: "https://apply.knight-hennessy.stanford.edu/apply/",
    description:
      "Knight-Hennessy Scholars at Stanford University is a fully funded graduate scholarship for future global leaders. It supports master's and PhD study across all seven Stanford graduate schools, covering tuition, stipend, academic expenses, and leadership development for international applicants alongside U.S. candidates.",
    eligibleRegions: US_ELIGIBLE_REGIONS,
  },
  {
    externalId: "hubert-humphrey-fellowship",
    title: "Hubert H. Humphrey Fellowship Program",
    organizationName: "U.S. Department of State",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "master",
    fieldOfStudy: "professional development",
    fundingType: "fully_funded",
    url: "https://www.humphreyfellowship.org/how-to-apply/eligibility/",
    applicationUrl: "https://www.humphreyfellowship.org/how-to-apply/u-s-embassies-commissions/",
    description:
      "The Hubert H. Humphrey Fellowship brings experienced mid-career professionals from designated countries to the United States for ten months of non-degree graduate-level study, professional development, and leadership training at participating U.S. universities. Applicants apply through the U.S. Embassy or Fulbright Commission in their home country.",
    eligibleRegions: US_ELIGIBLE_REGIONS,
  },
  {
    externalId: "mandela-washington-fellowship",
    title: "Mandela Washington Fellowship for Young African Leaders",
    organizationName: "U.S. Department of State / YALI",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "master",
    fieldOfStudy: "leadership",
    fundingType: "fully_funded",
    url: "https://www.mandelawashingtonfellowship.org/about",
    applicationUrl: "https://www.mandelawashingtonfellowship.org/",
    description:
      "The Mandela Washington Fellowship is the flagship program of the Young African Leaders Initiative (YALI), bringing accomplished African civic, business, and community leaders ages 25–35 to U.S. universities for academic coursework, leadership training, and networking. Fellows are selected through a competitive process administered when the annual application opens on the official Fellowship website.",
    eligibleRegions: ["africa"],
  },
  {
    externalId: "aauw-international-fellowship",
    title: "AAUW International Fellowships",
    organizationName: "American Association of University Women (AAUW)",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    url: "https://www.aauw.org/resources/programs/fellowships-grants/aauw-international-fellowships/",
    applicationUrl: "https://aauw.fluxx.io/user_sessions/new",
    description:
      "AAUW International Fellowships support women who are not U.S. citizens or permanent residents for full-time graduate or postgraduate study in the United States, with emphasis on STEM fields and leadership in home communities. Awards fund tuition, living expenses, and educational costs for master's and doctoral degrees at accredited U.S. institutions.",
    eligibleRegions: ["international", "africa", "developing"],
  },
  {
    externalId: "peo-international-peace-scholarship",
    title: "P.E.O. International Peace Scholarship (IPS)",
    organizationName: "P.E.O. International",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "partially_funded",
    url: "https://www.peointernational.org/educational-support/international-peace-scholarship-fund/",
    applicationUrl:
      "https://www.peointernational.org/educational-support/international-peace-scholarship-fund/eligibility-and-application-process/",
    description:
      "The P.E.O. International Peace Scholarship Fund provides need-based awards up to $12,500 for women from countries other than the United States and Canada who are pursuing graduate study at accredited U.S. or Canadian universities. Applicants must demonstrate additional financial resources and intend to return home to foster global understanding.",
    eligibleRegions: ["international", "africa", "developing"],
  },
  {
    externalId: "techwomen-emerging-leaders",
    title: "TechWomen Emerging Leaders Program",
    organizationName: "U.S. Department of State / IIE",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "master",
    fieldOfStudy: "engineering",
    fundingType: "fully_funded",
    url: "https://www.techwomen.org/participants/eligibility-requirements",
    applicationUrl: "https://www.techwomen.org/participants/how-to-apply",
    description:
      "TechWomen is a U.S. Department of State professional exchange for emerging women leaders in STEM from Africa, Central and South Asia, and the Middle East. Selected participants receive a funded mentorship experience in the San Francisco Bay Area or Chicago, including travel, housing, and professional development activities.",
    eligibleRegions: ["africa", "asia", "developing", "international"],
  },
  {
    externalId: "techgirls-exchange",
    title: "TechGirls Exchange Program",
    organizationName: "U.S. Department of State / Legacy International",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "high_school",
    fieldOfStudy: "engineering",
    fundingType: "fully_funded",
    url: "https://techgirlsglobal.org/",
    applicationUrl: "https://techgirlsglobal.org/apply/eligibility-and-application-2/",
    description:
      "TechGirls is a U.S. summer exchange for girls ages 15–17 from participating countries in Sub-Saharan Africa, the Middle East, Asia, and the Americas who are interested in STEM. The program includes hands-on tech camps, mentorship, and follow-on community projects with costs covered by the U.S. Department of State.",
    eligibleRegions: ["africa", "asia", "international", "developing"],
  },
  {
    externalId: "community-college-initiative",
    title: "Community College Initiative (CCI) Program",
    organizationName: "U.S. Department of State",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "bachelor",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    url: "https://exchanges.state.gov/non-us/program/community-college-initiative-program",
    applicationUrl: "https://exchanges.state.gov/non-us/program/community-college-initiative-program",
    description:
      "The Community College Initiative Program provides one-year non-degree study at U.S. community colleges for international students from selected countries. Awards cover tuition, travel, living stipends, and health benefits for participants building workforce skills in fields such as agriculture, business, health, and STEM.",
    eligibleRegions: US_ELIGIBLE_REGIONS,
  },
  {
    externalId: "global-ugrad",
    title: "Global Undergraduate Exchange Program (Global UGRAD)",
    organizationName: "U.S. Department of State",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "bachelor",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    url: "https://exchanges.state.gov/non-us/program/global-undergraduate-exchange-program-global-ugrad",
    applicationUrl: "https://exchanges.state.gov/non-us/program/global-undergraduate-exchange-program-global-ugrad",
    description:
      "Global UGRAD provides one-semester scholarships to outstanding undergraduate students from diverse countries for non-degree study and cultural exchange at U.S. colleges and universities. The program covers travel, tuition, housing, and living costs for participants who return home to share their experience.",
    eligibleRegions: US_ELIGIBLE_REGIONS,
  },
  {
    externalId: "american-university-egls",
    title: "American University Emerging Global Leader Scholarship (AU EGLS)",
    organizationName: "American University",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "bachelor",
    fieldOfStudy: "international development",
    fundingType: "fully_funded",
    url: "https://www.american.edu/admissions/international/first-year-merit.cfm",
    applicationUrl: "https://www.american.edu/admissions/international/au-egls-apply.cfm",
    description:
      "The AU Emerging Global Leader Scholarship (AU EGLS) supports international undergraduate students dedicated to civic and social change in under-resourced home communities. Full awards cover billable AU expenses (tuition, room, and board) for two students needing an F-1 or J-1 visa; additional partial EGL awards may also be offered. Apply via Common App first, then submit the AU EGLS application in the applicant portal.",
    eligibleRegions: US_ELIGIBLE_REGIONS,
  },
  {
    externalId: "clark-global-scholars",
    title: "Clark University Global Scholars Program Scholarship",
    organizationName: "Clark University",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "bachelor",
    fieldOfStudy: "multiple disciplines",
    fundingType: "partially_funded",
    url: "https://www.clarku.edu/financial-aid/prospective-students/international-students/faqs/",
    applicationUrl: "https://www.clarku.edu/financial-aid/prospective-students/international-students/faqs/",
    description:
      "Clark University's Global Scholars Program Scholarship supports outstanding international first-year applicants who are engaged in their communities and will complete secondary school outside the United States. Separate application essays are required in addition to Clark admission; merit awards for international students also include Traina, Achievement, and Jonas Clark scholarships.",
    eligibleRegions: US_ELIGIBLE_REGIONS,
  },
];

function usInternationalLeafProgrammes() {
  return US_INTERNATIONAL_PROGRAMMES.map((programme) => ({
    ...programme,
    sourceUrl: programme.url,
    descriptionFromSite: false,
  }));
}

module.exports = {
  US_INTERNATIONAL_PROGRAMMES,
  usInternationalLeafProgrammes,
};
