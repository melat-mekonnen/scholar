const COMMONWEALTH_SHARED_CONTACTS =
  "https://cscuk.fcdo.gov.uk/commonwealth-shared-scholarships-university-contact-details/";
const { resolveSharedUniversityUrl } = require("./sharedUniversityLeafUrls");
const COMMONWEALTH_SHARED_SCHEME =
  "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-shared-scholarships/";
const CSC_CENTRAL = "https://cscuk.fcdo.gov.uk/apply/";

const SHARED_CYCLE = {
  academicYear: "2026/27",
  studyStart: "September/October 2026",
  applicationStatus: "closed",
};

function sharedDescription({ university, slots, email, notes }) {
  const parts = [
    `Commonwealth Shared Scholarship at ${university} for the ${SHARED_CYCLE.academicYear} academic year.`,
    `${slots} fully funded master's award${slots === 1 ? "" : "s"} for study in the United Kingdom beginning ${SHARED_CYCLE.studyStart}.`,
    "Shared Scholarships are co-funded by the Commonwealth Scholarship Commission (CSC) and participating UK universities.",
    "Candidates must apply through CSC Central and separately apply for admission to an approved master's course at this university.",
    email ? `University contact: ${email}.` : null,
    notes ? notes : null,
    `CSC Shared Scholarship applications for ${SHARED_CYCLE.academicYear} are currently ${SHARED_CYCLE.applicationStatus}.`,
    `Official scheme guidance: ${COMMONWEALTH_SHARED_SCHEME}`,
    `University listing source: ${COMMONWEALTH_SHARED_CONTACTS}`,
  ];
  return parts.filter(Boolean).join(" ");
}

/** 2026 Commonwealth Shared Scholarship university placements (CSC contact listing). */
const COMMONWEALTH_SHARED_UNIVERSITIES = [
  {
    slug: "aberystwyth",
    university: "Aberystwyth University",
    slots: 2,
    email: "internationalfunding@aber.ac.uk",
    website: "https://www.aber.ac.uk/en/postgrad",
  },
  {
    slug: "bangor",
    university: "Bangor University",
    slots: 8,
    email: "internationalrecruitment@bangor.ac.uk",
    website: "https://www.bangor.ac.uk/international/future/commonwealth",
    notes:
      "Bangor gives preference to candidates who are residents of Uganda and Kenya and work with The Windle Trust.",
  },
  {
    slug: "bournemouth",
    university: "Bournemouth University",
    slots: 2,
    email: "international@bournemouth.ac.uk",
    website: "https://www.bournemouth.ac.uk",
  },
  {
    slug: "brunel",
    university: "Brunel University London",
    slots: 2,
    email: "mohammed.alam@brunel.ac.uk",
    website: "https://www.brunel.ac.uk",
  },
  {
    slug: "cranfield",
    university: "Cranfield University",
    slots: 6,
    email: "studentfunding@cranfield.ac.uk",
    website:
      "https://www.cranfield.ac.uk/funding/funding-opportunities/commonwealth-shared-scholarship-scheme",
  },
  {
    slug: "durham",
    university: "Durham University",
    slots: 2,
    email: "scholarships.advice@durham.ac.uk",
    website: "https://www.durham.ac.uk/study/scholarships/postgraduate/commonwealth-shared-scholarships",
  },
  {
    slug: "harper-adams",
    university: "Harper Adams University",
    slots: 2,
    email: "mcrook@harper-adams.ac.uk",
    website: "https://www.harper-adams.ac.uk",
  },
  {
    slug: "imperial",
    university: "Imperial College London",
    slots: 2,
    email: "student.funding@imperial.ac.uk",
    website: "https://www.imperial.ac.uk/study/fees-and-funding/scholarships-search",
  },
  {
    slug: "kcl",
    university: "King's College London",
    slots: 2,
    email: "doctoral-college@kcl.ac.uk",
    website: "https://www.kcl.ac.uk",
  },
  {
    slug: "lancaster",
    university: "Lancaster University",
    slots: 2,
    email: "pgadmissions@lancaster.ac.uk",
    website: "https://www.lancaster.ac.uk",
  },
  {
    slug: "liverpool-hope",
    university: "Liverpool Hope University",
    slots: 2,
    email: "international@hope.ac.uk",
    website: "https://www.hope.ac.uk",
  },
  {
    slug: "lstmed",
    university: "Liverpool School of Tropical Medicine",
    slots: 2,
    email: "mylstm@lstmed.ac.uk",
    website: "https://www.lstmed.ac.uk",
    notes:
      "MSc Public Health for Global Practice may prefer candidates from Uganda, The Gambia, South Africa, Tanzania, Zambia, Malawi, and India.",
  },
  {
    slug: "lse",
    university: "London School of Economics and Political Science",
    slots: 4,
    email: "financial-support@lse.ac.uk",
    website: "https://www.lse.ac.uk/study-at-lse/Graduate/fees-and-funding/csss",
  },
  {
    slug: "lshtm",
    university: "London School of Hygiene and Tropical Medicine",
    slots: 6,
    email: "scholarships@lshtm.ac.uk",
    website: "https://www.lshtm.ac.uk/study/fees-and-funding/funding-scholarships/masters-funding",
  },
  {
    slug: "newcastle",
    university: "Newcastle University",
    slots: 6,
    email: "scholarship.applications@ncl.ac.uk",
    website: "https://www.ncl.ac.uk",
  },
  {
    slug: "qub",
    university: "Queen's University Belfast",
    slots: 2,
    email: "pgawards@qub.ac.uk",
    website: "https://www.qub.ac.uk/Study/funding-scholarships",
  },
  {
    slug: "rgu",
    university: "Robert Gordon University",
    slots: 2,
    email: "scholarship-award@rgu.ac.uk",
    website: "https://www.rgu.ac.uk",
  },
  {
    slug: "rau",
    university: "Royal Agricultural University",
    slots: 2,
    email: "admissions@rau.ac.uk",
    website: "https://www.rau.ac.uk/courses/postgraduate/msc-sustainable-agriculture-and-food-security",
  },
  {
    slug: "rvc",
    university: "Royal Veterinary College",
    slots: 2,
    email: "admissions@rvc.ac.uk",
    website: "https://www.rvc.ac.uk/study/postgraduate",
  },
  {
    slug: "sheffield-hallam",
    university: "Sheffield Hallam University",
    slots: 2,
    email: "international@shu.ac.uk",
    website: "https://www.shu.ac.uk/funding/scholarships-and-bursaries/commonwealth-shared-scholarship-scheme",
  },
  {
    slug: "soas",
    university: "SOAS, University of London",
    slots: 8,
    email: "scholarships@soas.ac.uk",
    website: "https://www.soas.ac.uk",
  },
  {
    slug: "ucl",
    university: "University College London (UCL)",
    slots: 8,
    email: "studentfunding@ucl.ac.uk",
    website: "https://www.ucl.ac.uk/scholarships",
  },
  {
    slug: "aberdeen",
    university: "University of Aberdeen",
    slots: 4,
    email: "r.j.findlay@abdn.ac.uk",
    website: "https://www.abdn.ac.uk",
  },
  {
    slug: "bath",
    university: "University of Bath",
    slots: 3,
    email: "pgtfunding@bath.ac.uk",
    website: "https://www.bath.ac.uk",
  },
  {
    slug: "birmingham",
    university: "University of Birmingham",
    slots: 2,
    email: "fga@contacts.bham.ac.uk",
    website: "https://www.birmingham.ac.uk/funding/postgraduate/commonwealth-shared-scholarship-scheme",
  },
  {
    slug: "bristol",
    university: "University of Bristol",
    slots: 6,
    email: "international-scholarships@bristol.ac.uk",
    website: "https://www.bristol.ac.uk",
  },
  {
    slug: "cambridge",
    university: "University of Cambridge",
    slots: 8,
    email: "cambridge.trust@admin.cam.ac.uk",
    website: "https://www.cambridgetrust.org",
  },
  {
    slug: "chester",
    university: "University of Chester",
    slots: 4,
    email: "international@chester.ac.uk",
    website: "https://www.chester.ac.uk",
  },
  {
    slug: "uea",
    university: "University of East Anglia",
    slots: 2,
    email: "scholarships@uea.ac.uk",
    website: "https://www.uea.ac.uk/study/postgraduate",
  },
  {
    slug: "edinburgh",
    university: "University of Edinburgh",
    slots: 2,
    email: "sarah.mcallister@ed.ac.uk",
    website:
      "https://www.registryservices.ed.ac.uk/student-funding/postgraduate/international/other-funding/commonwealth-shared",
  },
  {
    slug: "exeter",
    university: "University of Exeter",
    slots: 3,
    email: "isrscholarships@exeter.ac.uk",
    website: "https://www.exeter.ac.uk",
  },
  {
    slug: "glasgow",
    university: "University of Glasgow",
    slots: 5,
    email: "scholarships@glasgow.ac.uk",
    website: "https://www.gla.ac.uk/scholarships",
  },
  {
    slug: "leeds",
    university: "University of Leeds",
    slots: 4,
    email: "pg_scholarships@leeds.ac.uk",
    website: "https://www.leeds.ac.uk/masters-additional-funding-support/doc/scholarships-charities-trusts",
  },
  {
    slug: "liverpool",
    university: "University of Liverpool",
    slots: 2,
    email: "cbateman@liverpool.ac.uk",
    website: "https://www.liverpool.ac.uk",
  },
  {
    slug: "nottingham",
    university: "University of Nottingham",
    slots: 3,
    email: "strategicpartner@nottingham.ac.uk",
    website: "https://www.nottingham.ac.uk/pgstudy/funding/commonwealth-shared-scholarship",
  },
  {
    slug: "oxford",
    university: "University of Oxford",
    slots: 8,
    email: "ogs@admin.ox.ac.uk",
    website: "https://www.ox.ac.uk",
  },
  {
    slug: "reading",
    university: "University of Reading",
    slots: 2,
    email: "scholarships@reading.ac.uk",
    website:
      "https://www.reading.ac.uk/ready-to-study/study/fees-and-funding/fees-and-funding-pg/commonwealth-shared-scholarships",
  },
  {
    slug: "southampton",
    university: "University of Southampton",
    slots: 2,
    email: "s.morss@soton.ac.uk",
    website: "https://www.southampton.ac.uk/courses/funding/scholarships-awards/commonwealth-shared.page",
  },
  {
    slug: "st-andrews",
    university: "University of St Andrews",
    slots: 2,
    email: "pgscholarships@st-andrews.ac.uk",
    website:
      "https://www.st-andrews.ac.uk/study/fees-and-funding/scholarships/scholarships-catalogue/postgraduate-scholarships/commonwealth-shared-scholarship-scheme",
  },
  {
    slug: "stirling",
    university: "University of Stirling",
    slots: 2,
    email: "internationalprogression@stir.ac.uk",
    website: "https://www.stir.ac.uk/scholarships/general/postgraduate/commonwealth-shared-scholarships",
  },
  {
    slug: "strathclyde",
    university: "University of Strathclyde",
    slots: 6,
    email: "commonwealth-shared@strath.ac.uk",
    website: "https://www.strath.ac.uk/studywithus/scholarships/commonwealthsharedscholarship",
  },
  {
    slug: "surrey",
    university: "University of Surrey",
    slots: 2,
    email: "international@surrey.ac.uk",
    website: "https://www.surrey.ac.uk/fees-and-funding/scholarships-and-bursaries",
  },
  {
    slug: "sussex",
    university: "University of Sussex (Institute of Development Studies)",
    slots: 2,
    email: "teaching@ids.ac.uk",
    website: "https://www.ids.ac.uk",
  },
  {
    slug: "warwick",
    university: "University of Warwick",
    slots: 6,
    email: "scholars@warwick.ac.uk",
    website: "https://warwick.ac.uk/study/scholarships-funding/international-scholars/",
  },
];

function commonwealthSharedLeafProgrammes() {
  return COMMONWEALTH_SHARED_UNIVERSITIES.map((entry) => {
    const website = resolveSharedUniversityUrl(entry);
    return {
      externalId: `commonwealth-shared-${entry.slug}`,
      title: `Commonwealth Shared Scholarship — ${entry.university} (${entry.slots} awards)`,
      organizationName: entry.university,
      country: "United Kingdom",
      hostCountry: "United Kingdom",
      degreeLevel: "master",
      fieldOfStudy: "approved master's courses at participating UK universities",
      fundingType: "fully_funded",
      amount: `${entry.slots} fully funded Shared Scholarship award${entry.slots === 1 ? "" : "s"}`,
      applicationStartDate: null,
      applicationEndDate: null,
      deadline: null,
      url: website,
      applicationUrl: website,
      sourceUrl: website,
      secondaryApplyUrl: CSC_CENTRAL,
      description: sharedDescription(entry),
      eligibleRegions: ["africa", "commonwealth", "developing"],
    };
  });
}

module.exports = {
  COMMONWEALTH_SHARED_UNIVERSITIES,
  COMMONWEALTH_SHARED_CONTACTS,
  COMMONWEALTH_SHARED_SCHEME,
  CSC_CENTRAL,
  SHARED_CYCLE,
  commonwealthSharedLeafProgrammes,
};
