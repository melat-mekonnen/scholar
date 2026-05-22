const { CURATED_DAAD_PROGRAMMES } = require("../connectors/daadConnector");
const { commonwealthSharedLeafProgrammes } = require("./commonwealthSharedUniversities");
const { commonwealthDistanceLeafProgrammes } = require("./commonwealthDistanceCourses");
const { cheveningLeafProgrammes } = require("./cheveningProgrammes");
const {
  commonwealthMastersNominatorLeafProgrammes,
  commonwealthPhdNominatorLeafProgrammes,
  commonwealthProfessionalFellowshipLeafProgramme,
} = require("./commonwealthNominators");
const { buildLeafRecordsFromList } = require("./buildLeafProgrammeRecord");
const { warwickSharedCourseProgrammes } = require("./warwickSharedCourses");

/** Programmes fetched from official pages (already leaf-level URLs). */
const PHASE1_SCRAPE_PROGRAMMES = [
  // —— United States ——
  {
    externalId: "fulbright-foreign-student",
    url: "https://foreign.fulbrightonline.org/apply",
    organizationName: "Fulbright Program",
    country: "United States",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    titleHint: "Fulbright Foreign Student Program",
  },
  {
    externalId: "fulbright-flta",
    url: "https://foreign.fulbrightonline.org/about/types-of-awards/fulbright-foreign-language-teaching-assistant-flta-grants",
    organizationName: "Fulbright Program",
    country: "United States",
    degreeLevel: "bachelor",
    fieldOfStudy: "language teaching",
    fundingType: "fully_funded",
    titleHint: "Fulbright FLTA Program",
  },

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
    url: "https://mastercardfdn.org/research/scholars-program/",
    organizationName: "Mastercard Foundation",
    country: "Canada",
    degreeLevel: "master",
    fundingType: "fully_funded",
    titleHint: "Mastercard Foundation Scholars — Research",
  },
  {
    externalId: "mandelarhodes",
    url: "https://www.mandelarhodes.org/apply/",
    organizationName: "Mandela Rhodes Foundation",
    country: "South Africa",
    degreeLevel: "master",
    fundingType: "fully_funded",
    titleHint: "Mandela Rhodes Scholarship",
  },
  {
    externalId: "ashinaga-africa",
    url: "https://ashinaga.org/scholarships/",
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
    url: "https://www.nsfas.org.za/content/how-it-works.html",
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
  {
    externalId: "et-moe-foreign-study",
    url: "https://www.moe.gov.et/en/foreign-study-programs",
    organizationName: "Ministry of Education — Ethiopia",
    country: "Ethiopia",
    degreeLevel: "master",
    fundingType: "fully_funded",
    titleHint: "Ethiopia Foreign Study Programmes",
  },
];

const PHASE1_CURATED_DESCRIPTIONS = {
  "fulbright-foreign-student":
    "The Fulbright Foreign Student Program enables graduate students, young professionals, and artists from abroad to study and conduct research in the United States at participating universities.",
  "fulbright-flta":
    "Fulbright Foreign Language Teaching Assistant (FLTA) grants place early-career teachers of English or foreign languages at US colleges for one academic year to teach language and culture.",
  "daad-in-region":
    "DAAD In-Country and In-Region scholarships support postgraduate study for candidates in Sub-Saharan Africa at selected universities, often with a development-focused master's curriculum.",
  "daad-epos":
    "DAAD Development-Related Postgraduate Courses (EPOS) fund international graduates from developing countries to pursue development-oriented master's degrees at German universities.",
  "daad-research-grants":
    "DAAD Research Grants support highly qualified doctoral candidates and young academics to carry out research or doctoral work in Germany at universities or research institutions.",
  "daad-study-scholarships":
    "DAAD Study Scholarships provide funding for international graduates to complete a full master's degree programme or additional study at a state or state-recognised German university.",
  "daad-study-stipends":
    "DAAD Study Stipends support individual semesters or short study visits for international students at German higher education institutions under defined programme rules.",
  "daad-graduate-schools":
    "DAAD funding for structured graduate schools supports doctoral researchers within organised programmes at German universities, often with interdisciplinary training.",
  "daad-undergraduate":
    "DAAD undergraduate scholarships support international students for bachelor's-level study or preparatory programmes at German higher education institutions where offered.",
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
  "et-moe-foreign-study":
    "Ethiopia's Ministry of Education foreign study programmes coordinate government-sponsored opportunities for Ethiopian students to pursue higher education abroad in priority disciplines.",
};

function leafProgrammeDefinitions() {
  return [
    ...commonwealthSharedLeafProgrammes(),
    ...warwickSharedCourseProgrammes(),
    ...commonwealthDistanceLeafProgrammes(),
    ...commonwealthMastersNominatorLeafProgrammes(),
    ...commonwealthPhdNominatorLeafProgrammes(),
    ...commonwealthProfessionalFellowshipLeafProgramme(),
    ...cheveningLeafProgrammes(),
  ];
}

function buildLeafImportRecords() {
  return buildLeafRecordsFromList(leafProgrammeDefinitions());
}

function phase1ScrapeProgrammesWithDescriptions() {
  return PHASE1_SCRAPE_PROGRAMMES.map((programme) => ({
    ...programme,
    curatedDescription: PHASE1_CURATED_DESCRIPTIONS[programme.externalId],
  }));
}

function catalogSummary() {
  const leaf = leafProgrammeDefinitions();
  const scrape = PHASE1_SCRAPE_PROGRAMMES;
  return {
    leafCount: leaf.length,
    scrapeCount: scrape.length,
    totalConfigured: leaf.length + scrape.length,
    byFamily: {
      commonwealthShared: commonwealthSharedLeafProgrammes().length,
      warwickSharedCourses: warwickSharedCourseProgrammes().length,
      commonwealthDistance: commonwealthDistanceLeafProgrammes().length,
      commonwealthMastersNominators: commonwealthMastersNominatorLeafProgrammes().length,
      commonwealthPhdNominators: commonwealthPhdNominatorLeafProgrammes().length,
      chevening: cheveningLeafProgrammes().length,
      scrapeProgrammes: scrape.length,
    },
  };
}

module.exports = {
  PHASE1_SCRAPE_PROGRAMMES,
  PHASE1_CURATED_DESCRIPTIONS,
  leafProgrammeDefinitions,
  buildLeafImportRecords,
  phase1ScrapeProgrammesWithDescriptions,
  catalogSummary,
};
