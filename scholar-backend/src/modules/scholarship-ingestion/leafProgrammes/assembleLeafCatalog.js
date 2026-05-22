const { CURATED_DAAD_PROGRAMMES } = require("../connectors/daadConnector");
const { commonwealthSharedLeafProgrammes } = require("./commonwealthSharedUniversities");
const { commonwealthDistanceLeafProgrammes } = require("./commonwealthDistanceCourses");
const { cheveningLeafProgrammes } = require("./cheveningProgrammes");
const { usInternationalLeafProgrammes } = require("./usInternationalLeafProgrammes");
const {
  commonwealthMastersNominatorLeafProgrammes,
  commonwealthPhdNominatorLeafProgrammes,
  commonwealthProfessionalFellowshipLeafProgramme,
} = require("./commonwealthNominators");
const { buildLeafRecordsFromList } = require("./buildLeafProgrammeRecord");
const { warwickSharedCourseProgrammes } = require("./warwickSharedCourses");
const { sharedUniversityCourseProgrammes } = require("./sharedUniversityCourses");

/** Programmes fetched from official pages (already leaf-level URLs). */
const SCRAPE_PROGRAMME_DEFINITIONS = [
  // —— Germany (DAAD curated — no open-ended hub crawl) ——
  ...CURATED_DAAD_PROGRAMMES.filter((p) => p.externalId !== "daad-funding-database"),

  // —— Australia ——
  {
    externalId: "australia-awards-scholarships",
    url: "https://www.dfat.gov.au/people-to-people/australia-awards/australia-awards-scholarships",
    organizationName: "Australia Awards (DFAT)",
    country: "Australia",
    degreeLevel: "master",
    fundingType: "fully_funded",
    titleHint: "Australia Awards Scholarships",
  },
  {
    externalId: "australia-awards-africa",
    url: "https://www.australiaawards.gov.au/applications",
    organizationName: "Australia Awards",
    country: "Australia",
    degreeLevel: "master",
    fundingType: "fully_funded",
    titleHint: "Australia Awards — Africa and Indo-Pacific",
  },

  // —— EU ——
  {
    externalId: "erasmus-mundus-masters",
    url: "https://erasmus-plus.ec.europa.eu/opportunities/opportunities-for-individuals/students/erasmus-mundus-joint-masters",
    organizationName: "Erasmus+",
    country: "European Union",
    degreeLevel: "master",
    fundingType: "fully_funded",
    titleHint: "Erasmus Mundus Joint Masters",
  },
  {
    externalId: "erasmus-mundus-catalogue",
    url: "https://www.eacea.ec.europa.eu/scholarships/emjmd-catalogue_en",
    organizationName: "Erasmus+",
    country: "European Union",
    degreeLevel: "master",
    fundingType: "fully_funded",
    titleHint: "Erasmus Mundus Catalogue",
  },

  // —— Africa-focused foundations ——
  {
    externalId: "mastercard-foundation-scholars",
    url: "https://mastercardfoundation.org/scholars/",
    organizationName: "Mastercard Foundation",
    country: "Canada",
    degreeLevel: "master",
    fundingType: "fully_funded",
    titleHint: "Mastercard Foundation Scholars Program",
  },
  {
    externalId: "mastercard-fdn-scholars",
    url: "https://mastercardfdn.org/all/scholars/",
    organizationName: "Mastercard Foundation",
    country: "Canada",
    degreeLevel: "master",
    fundingType: "fully_funded",
    titleHint: "Mastercard Foundation Scholars — Research",
  },
  {
    externalId: "mandelarhodes",
    url: "https://www.mandelarhodes.org/scholarship/apply/",
    organizationName: "Mandela Rhodes Foundation",
    country: "South Africa",
    degreeLevel: "master",
    fundingType: "fully_funded",
    titleHint: "Mandela Rhodes Scholarship",
  },
  {
    externalId: "ashinaga-africa",
    url: "https://www.ashinaga.org/en/our-work/ashinaga-africa-initiative/",
    organizationName: "Ashinaga Africa Initiative",
    country: "Japan",
    degreeLevel: "bachelor",
    fundingType: "fully_funded",
    titleHint: "Ashinaga Africa Initiative",
  },
  {
    externalId: "aga-khan-foundation",
    url: "https://www.akdn.org/our-agencies/aga-khan-foundation/education",
    organizationName: "Aga Khan Foundation",
    country: "International",
    degreeLevel: "master",
    fundingType: "partially_funded",
    titleHint: "Aga Khan Foundation — Education Scholarships",
  },

  // —— African governments (single programme pages) ——
  {
    externalId: "ng-education-fsb",
    url: "https://education.gov.ng/federal-scholarships-board/",
    organizationName: "Federal Ministry of Education — Nigeria",
    country: "Nigeria",
    degreeLevel: "master",
    fundingType: "fully_funded",
    titleHint: "Federal Scholarships Board (FSB) — Nigeria",
  },
  {
    externalId: "ke-jkf-scholarships",
    url: "https://www.jkf.co.ke/index.php/scholarships",
    organizationName: "Ministry of Education — Kenya / Jomo Kenyatta Foundation",
    country: "Kenya",
    degreeLevel: "bachelor",
    fundingType: "fully_funded",
    titleHint: "ELIMU & Jomo Kenyatta Foundation Scholarships — Kenya",
  },
  {
    externalId: "za-nsfas",
    url: "https://www.nsfas.org.za/content/index.html",
    organizationName: "National Student Financial Aid Scheme",
    country: "South Africa",
    degreeLevel: "bachelor",
    fundingType: "fully_funded",
    titleHint: "NSFAS — South Africa",
  },
  {
    externalId: "gh-moe-scholarship",
    url: "https://moe.gov.gh/2024/01/15/government-of-ghana-scholarship-for-tertiary-education/",
    organizationName: "Ministry of Education — Ghana",
    country: "Ghana",
    degreeLevel: "bachelor",
    fundingType: "fully_funded",
    titleHint: "Government of Ghana Scholarship for Tertiary Education",
  },
];

const SCRAPE_PROGRAMME_DESCRIPTIONS = {
  "fulbright-foreign-student":
    "The Fulbright Foreign Student Program enables graduate students, young professionals, and artists from abroad to study and conduct research in the United States at participating universities.",
  "fulbright-flta":
    "Fulbright Foreign Language Teaching Assistant (FLTA) grants place early-career teachers of English or foreign languages at US colleges for one academic year to teach language and culture.",
  "daad-in-region":
    "DAAD In-Country and In-Region scholarships provide fully funded postgraduate study for candidates in Sub-Saharan Africa at selected universities. Check eligibility and apply through the official DAAD scholarship programme page.",
  "daad-epos":
    "DAAD Development-Related Postgraduate Courses (EPOS) offer fully funded scholarships for international graduates from developing countries to pursue development-oriented master's degrees at German universities. Apply via the official programme page.",
  "daad-research-grants":
    "DAAD Research Grants provide fully funded scholarship support for doctoral candidates and young academics to carry out research in Germany at universities or research institutes. Review eligibility and apply on the official page.",
  "daad-study-scholarships":
    "DAAD Study Scholarships provide funding for international graduates to complete a full master's degree programme or additional study at a state or state-recognised German university.",
  "daad-study-stipends":
    "DAAD University Summer Courses offer scholarship funding for international students and graduates to attend intensive German-language and subject courses at German universities. Apply through the official DAAD programme page.",
  "daad-graduate-schools":
    "DAAD Doctoral Programmes in Germany provide fully funded PhD scholarships for international candidates at state or state-recognised universities and research institutes. Check eligibility and apply via the official page.",
  "daad-undergraduate":
    "The Deutschlandstipendium supports high-achieving students at German higher education institutions with monthly scholarship funding alongside private and public co-financing.",
  "australia-awards-scholarships":
    "Australia Awards Scholarships are long-term development awards funded by the Australian Government. They support study at participating Australian institutions for people from partner countries in the Indo-Pacific and beyond.",
  "australia-awards-africa":
    "Australia Awards for Africa support citizens of eligible African countries to undertake postgraduate study, research, and professional development in Australia in priority development fields.",
  "erasmus-mundus-masters":
    "Erasmus Mundus Joint Masters are integrated, international master's programmes delivered by consortia of EU and partner universities, often with EU-funded scholarships for top-ranked applicants worldwide.",
  "erasmus-mundus-catalogue":
    "The Erasmus Mundus Joint Master catalogue lists accredited joint degree programmes and scholarship opportunities administered through the European Education and Culture Executive Agency.",
  "mastercard-foundation-scholars":
    "The Mastercard Foundation Scholars Program partners with universities and NGOs to provide holistic support—tuition, living costs, leadership training—for academically strong young Africans from disadvantaged backgrounds.",
  "mastercard-fdn-scholars":
    "Mastercard Foundation research on the Scholars Program documents programme outcomes and university partnerships that expand access to tertiary education for talented African youth.",
  "mandelarhodes":
    "The Mandela Rhodes Scholarship develops exceptional young African leaders through postgraduate study at South African universities, combined with leadership development and mentorship.",
  "ashinaga-africa":
    "The Ashinaga Africa Initiative supports orphaned students from Sub-Saharan Africa through university preparation, tuition, and living expenses for undergraduate study abroad or in Africa.",
  "aga-khan-foundation":
    "Aga Khan Foundation education scholarships assist outstanding students from select developing countries who lack other means of financing postgraduate study, with a focus on development-related fields.",
  "ng-education-fsb":
    "Nigeria's Federal Scholarships Board administers federal government awards for undergraduate and postgraduate study abroad and in Nigeria, including bilateral and commonwealth-linked schemes.",
  "ke-jkf-scholarships":
    "Kenya's ELIMU and Jomo Kenyatta Foundation scholarships support deserving students through secondary and tertiary education via government and foundation partnerships.",
  "za-nsfas":
    "NSFAS provides financial aid to eligible South African students at public universities and TVET colleges, covering tuition and allowances according to means-tested criteria.",
  "gh-moe-scholarship":
    "The Government of Ghana scholarship for tertiary education supports eligible Ghanaian students pursuing approved programmes at accredited institutions according to Ministry of Education guidelines.",
};

function leafProgrammeDefinitions() {
  return [
    ...commonwealthSharedLeafProgrammes(),
    ...warwickSharedCourseProgrammes(),
    ...sharedUniversityCourseProgrammes(),
    ...commonwealthDistanceLeafProgrammes(),
    ...commonwealthMastersNominatorLeafProgrammes(),
    ...commonwealthPhdNominatorLeafProgrammes(),
    ...commonwealthProfessionalFellowshipLeafProgramme(),
    ...cheveningLeafProgrammes(),
    ...usInternationalLeafProgrammes(),
  ];
}

function buildLeafImportRecords() {
  return buildLeafRecordsFromList(leafProgrammeDefinitions());
}

function scrapeProgrammesWithDescriptions() {
  return SCRAPE_PROGRAMME_DEFINITIONS.map((programme) => ({
    ...programme,
    curatedDescription: SCRAPE_PROGRAMME_DESCRIPTIONS[programme.externalId],
  }));
}

function catalogSummary() {
  const leaf = leafProgrammeDefinitions();
  const scrape = SCRAPE_PROGRAMME_DEFINITIONS;
  return {
    leafCount: leaf.length,
    scrapeCount: scrape.length,
    totalConfigured: leaf.length + scrape.length,
    byFamily: {
      commonwealthShared: commonwealthSharedLeafProgrammes().length,
      warwickSharedCourses: warwickSharedCourseProgrammes().length,
      sharedUniversityCourses: sharedUniversityCourseProgrammes().length,
      commonwealthDistance: commonwealthDistanceLeafProgrammes().length,
      commonwealthMastersNominators: commonwealthMastersNominatorLeafProgrammes().length,
      commonwealthPhdNominators: commonwealthPhdNominatorLeafProgrammes().length,
      chevening: cheveningLeafProgrammes().length,
      usInternational: usInternationalLeafProgrammes().length,
      scrapeProgrammes: scrape.length,
    },
  };
}

module.exports = {
  SCRAPE_PROGRAMME_DEFINITIONS,
  SCRAPE_PROGRAMME_DESCRIPTIONS,
  leafProgrammeDefinitions,
  buildLeafImportRecords,
  scrapeProgrammesWithDescriptions,
  catalogSummary,
};
