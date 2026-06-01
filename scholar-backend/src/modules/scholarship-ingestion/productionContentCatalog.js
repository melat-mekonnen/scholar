/**
 * Production-ready descriptions and apply URLs for seed / high-visibility listings.
 * Prefer official programme pages over homepages or listing hubs.
 */
const {
  PHASE1_CURATED_DESCRIPTIONS,
  buildLeafImportRecords,
  phase1ScrapeProgrammesWithDescriptions,
} = require("./leafProgrammes/assembleLeafCatalog");

/** @type {Record<string, { applicationUrl: string, sourceUrl?: string, description: string, degreeLevel?: string, fieldOfStudy?: string, fundingType?: string, isRolling?: boolean, organizationName?: string }>} */
const SEED_PRODUCTION_OVERRIDES = {
  "fulbright-2027": {
    applicationUrl: "https://foreign.fulbrightonline.org/apply",
    sourceUrl: "https://foreign.fulbrightonline.org/apply",
    description: PHASE1_CURATED_DESCRIPTIONS["fulbright-foreign-student"],
    degreeLevel: "master",
    fundingType: "fully_funded",
    isRolling: true,
    organizationName: "Fulbright Program",
  },
  "daad-epos-2027": {
    applicationUrl:
      "https://www.daad.de/en/study-and-research-in-germany/scholarships/daad-scholarships/development-related-postgraduate-courses/",
    description: PHASE1_CURATED_DESCRIPTIONS["daad-epos"],
    degreeLevel: "master",
    fieldOfStudy: "development studies",
    fundingType: "fully_funded",
    isRolling: true,
    organizationName: "DAAD",
  },
  "chevening-2027": {
    applicationUrl: "https://www.chevening.org/apply/",
    sourceUrl: "https://www.chevening.org/scholarships/",
    description:
      "Chevening Scholarships are the UK government's global scholarship programme, funded by the Foreign, Commonwealth and Development Office and partner organisations. " +
      "Awards cover full tuition, a monthly living allowance, economy return travel, and additional grants for essential expenditure for a one-year master's degree at any eligible UK university. " +
      "Applicants need two years' work experience, an undergraduate degree, and must apply through the official Chevening portal during the annual window for their country.",
    degreeLevel: "master",
    fundingType: "fully_funded",
    isRolling: false,
    organizationName: "Chevening (UK FCDO)",
  },
  "rhodes-2027": {
    applicationUrl: "https://www.rhodeshouse.ox.ac.uk/scholarships/apply/",
    sourceUrl: "https://www.rhodeshouse.ox.ac.uk/scholarships/the-rhodes-scholarship/",
    description:
      "The Rhodes Scholarship supports outstanding young people from eligible countries to pursue postgraduate study at the University of Oxford. " +
      "It is one of the oldest and most prestigious international scholarship programmes, covering Oxford course fees and providing a generous living stipend for two or more years of study. " +
      "Candidates are selected on academic excellence, leadership potential, and commitment to service. Apply through the Rhodes Trust national secretary for your country via the official Rhodes website.",
    degreeLevel: "master",
    fundingType: "fully_funded",
    isRolling: false,
    organizationName: "Rhodes Trust",
  },
  "gates-cambridge-2027": {
    applicationUrl: "https://www.gatescambridge.org/apply/",
    sourceUrl: "https://www.gatescambridge.org/programme/",
    description:
      "Gates Cambridge Scholarships fund full-cost postgraduate study at the University of Cambridge for applicants from countries outside the United Kingdom. " +
      "The programme seeks academically outstanding candidates with leadership potential and a commitment to improving the lives of others. " +
      "Awards cover the full cost of study at Cambridge plus discretionary funding. Candidates must apply for admission to Cambridge and complete the Gates Cambridge funding section by the programme deadline.",
    degreeLevel: "master",
    fundingType: "fully_funded",
    isRolling: false,
    organizationName: "Gates Cambridge Trust",
  },
  "turkiye-burslari-2027": {
    applicationUrl: "https://www.turkiyeburslari.gov.tr/scholarshipsprograms",
    sourceUrl: "https://www.turkiyeburslari.gov.tr/scholarshipsprograms",
    description:
      "Türkiye Scholarships (Türkiye Bursları) is a competitive government scholarship for international students to study at Turkish universities at bachelor's, master's, and doctoral levels. " +
      "Benefits typically include tuition, accommodation, health insurance, a monthly stipend, and a one-time flight ticket. " +
      "Applicants must meet academic achievement and age criteria and apply through the official Türkiye Scholarships portal during the annual application period.",
    degreeLevel: "master",
    fundingType: "fully_funded",
    isRolling: false,
    organizationName: "Türkiye Scholarships",
  },
  "gks-2027": {
    applicationUrl: "https://www.studyinkorea.go.kr/en/united/united1050.do",
    sourceUrl: "https://www.studyinkorea.go.kr/en/sub/gks/allnew_invite.do",
    description:
      "The Global Korea Scholarship (GKS), administered by the National Institute for International Education (NIIED), supports international students for undergraduate and graduate study at designated Korean universities. " +
      "Benefits include tuition, a monthly allowance, settlement and return airfare, Korean language training, and medical insurance. " +
      "Applicants apply either through a Korean embassy/consulate in their home country or directly through a participating university, following the official Study in Korea guidelines.",
    degreeLevel: "master",
    fundingType: "fully_funded",
    isRolling: false,
    organizationName: "NIIED — Study in Korea",
  },
  "manaaki-nz-2027": {
    applicationUrl: "https://www.nzscholarships.govt.nz/",
    sourceUrl: "https://www.nzscholarships.govt.nz/",
    description:
      "Manaaki New Zealand Scholarships support citizens from eligible developing countries to study in New Zealand or at a Pacific university, with a focus on fields that contribute to development outcomes. " +
      "Scholarships cover tuition, living costs, travel, and insurance for study at certificate, diploma, bachelor's, or postgraduate level depending on the award category. " +
      "Applications are managed by the New Zealand Ministry of Foreign Affairs and Trade during published intake rounds on the official Manaaki New Zealand Scholarships website.",
    degreeLevel: "master",
    fundingType: "fully_funded",
    isRolling: false,
    organizationName: "Manaaki New Zealand Scholarships",
  },
  "taiwan-moe-2027": {
    applicationUrl: "https://www.studyintaiwan.org/scholarships",
    sourceUrl: "https://www.studyintaiwan.org/scholarships",
    description:
      "Taiwan Ministry of Education (MOE) scholarships support outstanding international students to pursue degree programmes at participating Taiwanese universities. " +
      "Awards may cover tuition and fees, living allowances, and other benefits depending on the specific MOE programme line. " +
      "Applicants should review eligibility by nationality and degree level on Study in Taiwan and apply through the official scholarship portal or via their Taiwan embassy during open calls.",
    degreeLevel: "master",
    fundingType: "fully_funded",
    isRolling: false,
    organizationName: "Ministry of Education — Taiwan",
  },
  "pearson-2027": {
    applicationUrl: "https://future.utoronto.ca/pearson/about/",
    sourceUrl: "https://future.utoronto.ca/pearson/about/",
    description:
      "The Lester B. Pearson International Scholarship at the University of Toronto covers tuition, books, incidental fees, and full residence support for four years of undergraduate study. " +
      "It is awarded to exceptional international students who demonstrate academic excellence, leadership, and creativity. " +
      "Students must be nominated by their secondary school and apply to the University of Toronto for an undergraduate place before completing the Pearson scholarship application on the official U of T future students site.",
    degreeLevel: "bachelor",
    fundingType: "fully_funded",
    isRolling: false,
    organizationName: "University of Toronto",
  },
  "schwarzman-2027": {
    applicationUrl: "https://www.schwarzmanscholars.org/admissions/",
    sourceUrl: "https://www.schwarzmanscholars.org/admissions/",
    description:
      "Schwarzman Scholars is a one-year master's programme at Tsinghua University in Beijing focused on global affairs, public policy, and leadership. " +
      "The scholarship covers tuition, room and board, travel to and from Beijing, health insurance, and a personal stipend. " +
      "Candidates aged 18–28 with strong academic records and leadership experience apply online during the annual admissions cycle on the official Schwarzman Scholars website.",
    degreeLevel: "master",
    fundingType: "fully_funded",
    isRolling: false,
    organizationName: "Schwarzman Scholars",
  },
  "sbw-berlin-2027": {
    applicationUrl: "https://sbw.berlin/en/scholarship/",
    sourceUrl: "https://sbw.berlin/en/scholarship/",
    description:
      "The SBW Berlin Scholarship supports talented young people from abroad who intend to use their education to contribute to sustainable, non-profit-oriented projects in their home countries. " +
      "Funding includes accommodation in Berlin, a monthly allowance, and tuition support for approved study paths linked to SBW's charitable mission. " +
      "Applicants must demonstrate financial need, academic ability, and a credible plan for social impact. Apply through the official SBW Berlin scholarship page.",
    degreeLevel: "bachelor",
    fundingType: "fully_funded",
    isRolling: true,
    organizationName: "SBW Berlin",
  },
  "macquarie-vc-2027": {
    applicationUrl:
      "https://www.mq.edu.au/study/admissions-and-entry/scholarships/international/vice-chancellors-international-scholarship",
    sourceUrl:
      "https://www.mq.edu.au/study/admissions-and-entry/scholarships/international/vice-chancellors-international-scholarship",
    description:
      "The Macquarie University Vice-Chancellor's International Scholarship provides partial tuition fee remission for high-achieving international students commencing an eligible undergraduate or postgraduate coursework degree. " +
      "Selection is based on academic merit and the scholarship is typically awarded automatically when you receive an offer of admission—no separate application is required for most international applicants. " +
      "Check current value, eligible courses, and conditions on the official Macquarie University international scholarships page.",
    degreeLevel: "bachelor",
    fundingType: "partially_funded",
    isRolling: true,
    organizationName: "Macquarie University",
  },
  "auckland-excellence-2027": {
    applicationUrl:
      "https://www.auckland.ac.nz/en/study/scholarships-and-awards/find-a-scholarship/university-of-auckland-international-student-excellence-scholarship-844-all.html",
    description:
      "The University of Auckland International Student Excellence Scholarship provides up to NZD $10,000 toward compulsory tuition fees for new international students enrolling in undergraduate degrees, postgraduate diplomas, or taught master's programmes. " +
      "Applicants must hold an offer of admission and submit a motivation letter during the published application windows for each intake. " +
      "Full eligibility criteria, opening dates, and how to apply are listed on the official University of Auckland scholarship page.",
    degreeLevel: "bachelor",
    fundingType: "partially_funded",
    isRolling: false,
    organizationName: "University of Auckland",
  },
  "hkust-redbird-phd-2027": {
    applicationUrl: "https://fytgs.hkust.edu.hk/admissions/aid-fellowship",
    sourceUrl: "https://fytgs.hkust.edu.hk/admissions/aid-fellowship",
    description:
      "HKUST RedBird PhD Awards and postgraduate fellowships support outstanding doctoral candidates at the Hong Kong University of Science and Technology with competitive stipends and tuition support. " +
      "Candidates apply for PhD admission through HKUST Graduate School and are considered for RedBird and other fellowship packages based on research merit. " +
      "See the HKUST postgraduate admissions financial aid page for current award levels and application steps.",
    degreeLevel: "phd",
    fundingType: "fully_funded",
    isRolling: true,
    organizationName: "HKUST",
  },
};

function buildCuratedByExternalId() {
  const map = new Map();

  for (const [externalId, description] of Object.entries(PHASE1_CURATED_DESCRIPTIONS)) {
    if (description && description.length >= 120) {
      map.set(externalId, { description });
    }
  }

  for (const record of buildLeafImportRecords()) {
    if (!record?.externalId || !record.description) continue;
    map.set(record.externalId, {
      description: record.description,
      applicationUrl: record.applicationUrl,
      sourceUrl: record.sourceUrl,
      degreeLevel: record.degreeLevel,
      fieldOfStudy: record.fieldOfStudy,
      fundingType: record.fundingType,
      isRolling: record.isRolling,
      organizationName: record.organizationName,
    });
  }

  for (const programme of phase1ScrapeProgrammesWithDescriptions()) {
    if (!programme.externalId || !programme.curatedDescription) continue;
    map.set(programme.externalId, {
      description: programme.curatedDescription,
      applicationUrl: programme.url,
      sourceUrl: programme.url,
    });
  }

  for (const [externalId, override] of Object.entries(SEED_PRODUCTION_OVERRIDES)) {
    map.set(externalId, { ...map.get(externalId), ...override });
  }

  return map;
}

function productionOverrideFor(externalId) {
  if (!externalId) return null;
  return SEED_PRODUCTION_OVERRIDES[externalId] || null;
}

module.exports = {
  SEED_PRODUCTION_OVERRIDES,
  buildCuratedByExternalId,
  productionOverrideFor,
};
