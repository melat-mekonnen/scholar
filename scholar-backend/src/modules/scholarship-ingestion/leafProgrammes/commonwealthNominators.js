const CSC_MASTERS_SCHEME =
  "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-masters-scholarships/";
const CSC_PHD_SCHEME =
  "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-phd-scholarships-for-least-developed-countries-and-vulnerable-states/";
const CSC_PROFESSIONAL_SCHEME =
  "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-professional-fellowships/";
const CSC_CENTRAL = "https://cscuk.fcdo.gov.uk/apply/";

function cscNominatorAnchor(entry, schemeUrl) {
  const base = String(schemeUrl || "").replace(/\/+$/, "");
  return `${base}/#nominator-${entry.slug}`;
}

/** Apply URL for nominator routes — CSC scheme page (reliable; national pages often move or 404). */
function nominatorApplicationUrl(entry, schemeUrl) {
  return cscNominatorAnchor(entry, schemeUrl);
}

const CSC_CYCLE = {
  academicYear: "2026/27",
  studyStart: "September/October 2026",
  applicationStatus: "closed",
};

function mastersNominatorDescription(entry, schemeUrl) {
  const cscNominator = cscNominatorAnchor(entry, schemeUrl);
  return [
    `Commonwealth Master's Scholarship route for ${entry.country} (${CSC_CYCLE.academicYear}).`,
    "Commonwealth Master's Scholarships fund full-time master's study in the UK for citizens of eligible Commonwealth countries.",
    "The CSC does not accept direct applications: candidates must apply through a national nominating agency or selected NGO nominator in their home country, and also complete the CSC Central application when the portal is open.",
    `National nominating agency for ${entry.country}: ${entry.agency}.`,
    entry.agencyWebsite ? `Agency website: ${entry.agencyWebsite}` : null,
    `Official CSC nominator page: ${cscNominator}`,
    `CSC application system (when open): ${CSC_CENTRAL}`,
    `Scheme overview: ${CSC_MASTERS_SCHEME}`,
    `Applications for ${CSC_CYCLE.academicYear} are currently ${CSC_CYCLE.applicationStatus}. Study would begin ${CSC_CYCLE.studyStart}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

function phdNominatorDescription(entry, schemeUrl) {
  const cscNominator = cscNominatorAnchor(entry, schemeUrl);
  return [
    `Commonwealth PhD Scholarship route for ${entry.country} (${CSC_CYCLE.academicYear}).`,
    "PhD Scholarships support doctoral study at UK universities for candidates from eligible least developed and vulnerable Commonwealth countries.",
    "Candidates must be nominated through their national nominating agency and apply via CSC Central when open.",
    `National nominating agency for ${entry.country}: ${entry.agency}.`,
    entry.agencyWebsite ? `Agency website: ${entry.agencyWebsite}` : null,
    `Official CSC nominator page: ${cscNominator}`,
    `CSC application system: ${CSC_CENTRAL}`,
    `Scheme overview: ${CSC_PHD_SCHEME}`,
    `Applications for ${CSC_CYCLE.academicYear} are currently ${CSC_CYCLE.applicationStatus}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

/** African Commonwealth countries with known national nominating agency pages in Scholar. */
const COMMONWEALTH_MASTERS_NOMINATORS = [
  {
    slug: "nigeria",
    country: "Nigeria",
    agency: "Federal Scholarships Board — Nigeria",
    agencyWebsite: "https://education.gov.ng/federal-scholarships-board/",
  },
  {
    slug: "kenya",
    country: "Kenya",
    agency: "Ministry of Education — Kenya",
    agencyWebsite: "https://www.education.go.ke/index.php/scholarships",
  },
  {
    slug: "ghana",
    country: "Ghana",
    agency: "Ministry of Education — Ghana",
    agencyWebsite: "https://moe.gov.gh/category/scholarships/",
  },
  {
    slug: "ethiopia",
    country: "Ethiopia",
    agency: "Ministry of Education — Ethiopia (Foreign Study Programmes)",
    agencyWebsite: "https://www.moe.gov.et/",
  },
  {
    slug: "south-africa",
    country: "South Africa",
    agency: "Department of Higher Education — South Africa",
    agencyWebsite: "https://www.dhet.gov.za/",
  },
  {
    slug: "uganda",
    country: "Uganda",
    agency: "Ministry of Education and Sports — Uganda",
    agencyWebsite: "https://www.education.go.ug/",
  },
  {
    slug: "tanzania",
    country: "Tanzania",
    agency: "Ministry of Education, Science and Technology — Tanzania",
    agencyWebsite: "https://www.moe.go.tz/",
  },
  {
    slug: "zambia",
    country: "Zambia",
    agency: "Ministry of Education — Zambia",
    agencyWebsite: "https://www.moe.gov.zm/",
  },
  {
    slug: "malawi",
    country: "Malawi",
    agency: "Ministry of Education — Malawi",
    agencyWebsite: "https://www.education.gov.mw/",
  },
  {
    slug: "rwanda",
    country: "Rwanda",
    agency: "Ministry of Education — Rwanda",
    agencyWebsite: "https://www.mineduc.gov.rw/",
  },
];

function commonwealthMastersNominatorLeafProgrammes() {
  return COMMONWEALTH_MASTERS_NOMINATORS.map((entry) => ({
    externalId: `commonwealth-masters-${entry.slug}`,
    title: `Commonwealth Master's Scholarship — ${entry.country} (via national nominator)`,
    organizationName: entry.agency,
    country: entry.country,
    hostCountry: "United Kingdom",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    url: nominatorApplicationUrl(entry, CSC_MASTERS_SCHEME),
    applicationUrl: nominatorApplicationUrl(entry, CSC_MASTERS_SCHEME),
    sourceUrl: cscNominatorAnchor(entry, CSC_MASTERS_SCHEME),
    applicationStartDate: null,
    applicationEndDate: null,
    deadline: null,
    description: mastersNominatorDescription(entry, CSC_MASTERS_SCHEME),
    eligibleRegions: ["africa", "commonwealth"],
  }));
}

function commonwealthPhdNominatorLeafProgrammes() {
  return COMMONWEALTH_MASTERS_NOMINATORS.map((entry) => ({
    externalId: `commonwealth-phd-${entry.slug}`,
    title: `Commonwealth PhD Scholarship — ${entry.country} (via national nominator)`,
    organizationName: entry.agency,
    country: entry.country,
    hostCountry: "United Kingdom",
    degreeLevel: "phd",
    fieldOfStudy: "doctoral research",
    fundingType: "fully_funded",
    url: nominatorApplicationUrl(entry, CSC_PHD_SCHEME),
    applicationUrl: nominatorApplicationUrl(entry, CSC_PHD_SCHEME),
    sourceUrl: cscNominatorAnchor(entry, CSC_PHD_SCHEME),
    applicationStartDate: null,
    applicationEndDate: null,
    deadline: null,
    description: phdNominatorDescription(entry, CSC_PHD_SCHEME),
    eligibleRegions: ["africa", "commonwealth"],
  }));
}

function commonwealthProfessionalFellowshipLeafProgramme() {
  return [
    {
      externalId: "commonwealth-professional-fellowships",
      title: "Commonwealth Professional Fellowships",
      organizationName: "Commonwealth Scholarship Commission",
      country: "United Kingdom",
      hostCountry: "United Kingdom",
      degreeLevel: "master",
      fieldOfStudy: "professional development",
      fundingType: "fully_funded",
      url: CSC_PROFESSIONAL_SCHEME,
      applicationUrl: CSC_PROFESSIONAL_SCHEME,
      sourceUrl: CSC_PROFESSIONAL_SCHEME,
      applicationStartDate: null,
      applicationEndDate: null,
      deadline: null,
      description: [
        "Commonwealth Professional Fellowships offer mid-career professionals from eligible Commonwealth countries short placements in UK host organisations.",
        "Fellowships develop skills and professional networks in sectors aligned with sustainable development.",
        `Applications for ${CSC_CYCLE.academicYear} are ${CSC_CYCLE.applicationStatus}.`,
        `Scheme details: ${CSC_PROFESSIONAL_SCHEME}`,
        `Apply via CSC Central when open: ${CSC_CENTRAL}`,
      ].join(" "),
      eligibleRegions: ["africa", "commonwealth"],
    },
  ];
}

module.exports = {
  commonwealthMastersNominatorLeafProgrammes,
  commonwealthPhdNominatorLeafProgrammes,
  commonwealthProfessionalFellowshipLeafProgramme,
  COMMONWEALTH_MASTERS_NOMINATORS,
};
