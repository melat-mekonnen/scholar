/**
 * Individual EduCanada programmes shown for Non-Canadian students from Ethiopia
 * (Student or Postdoctoral Researcher profile on the EduCanada search tool).
 * @see https://www.educanada.ca/scholarships-bourses/search-scholarships-rechercher-bourses.aspx?lang=eng
 */
const { buildLeafRecordsFromList } = require("./buildLeafProgrammeRecord");

const EDUCANADA_ETHIOPIA_PROGRAMMES = [
  {
    externalId: "educanada-study-in-canada",
    title: "Study in Canada Scholarships",
    organizationName: "Global Affairs Canada",
    country: "Canada",
    hostCountry: "Canada",
    degreeLevel: "master",
    fieldOfStudy: "multiple disciplines",
    fundingType: "fully_funded",
    applicationStartDate: "2027-01-22",
    applicationEndDate: "2027-03-31",
    isRolling: true,
    applicationUrl:
      "https://www.educanada.ca/scholarships-bourses/can/institutions/study-in-canada-sep-etudes-au-canada-pct.aspx?lang=eng",
    description:
      "Study in Canada Scholarships (2026/27) fund short-term exchange study or research (4–6 months) at Canadian post-secondary institutions for students from eligible countries including Ethiopia. " +
      "Canadian institutions apply on behalf of candidates; Ethiopian students should contact their home university international office about exchange agreements with Canadian partners. " +
      "Includes airfare, health insurance, living costs, and study-related fees when awarded.",
    eligibleRegions: ["africa", "developing"],
  },
  {
    externalId: "educanada-cgs-doctoral",
    title: "Canada Graduate Scholarships — Doctoral (CGS D)",
    organizationName: "Natural Sciences and Engineering Research Council of Canada (NSERC)",
    country: "Canada",
    hostCountry: "Canada",
    degreeLevel: "phd",
    fieldOfStudy: "research",
    fundingType: "fully_funded",
    applicationUrl:
      "https://nserc-crsng.canada.ca/en/funding-opportunity/canada-graduate-research-scholarship-doctoral-program",
    description:
      "The Canada Graduate Scholarships — Doctoral (CGS D) program supports high-calibre doctoral students at eligible Canadian universities in natural sciences and engineering. " +
      "Listed on EduCanada for international researchers; applications are submitted through a Canadian institution where the student is or will be enrolled.",
    eligibleRegions: ["africa", "developing"],
  },
  {
    externalId: "educanada-cifar-global-scholars",
    title: "CIFAR Azrieli Global Scholars Program",
    organizationName: "Canadian Institute for Advanced Research (CIFAR)",
    country: "Canada",
    hostCountry: "Canada",
    degreeLevel: "phd",
    fieldOfStudy: "interdisciplinary research",
    fundingType: "fully_funded",
    applicationUrl: "https://cifar.ca/cifar-global-scholars/",
    description:
      "CIFAR Azrieli Global Scholars supports early-career researchers with CAD $100,000 in unrestricted research funding and two years in a CIFAR research program. " +
      "Open to outstanding researchers worldwide who hold a PhD and an independent faculty or equivalent research position.",
    eligibleRegions: ["africa", "developing"],
  },
  {
    externalId: "educanada-cihr-fellowship",
    title: "CIHR Fellowship",
    organizationName: "Canadian Institutes of Health Research (CIHR)",
    country: "Canada",
    hostCountry: "Canada",
    degreeLevel: "phd",
    fieldOfStudy: "health research",
    fundingType: "fully_funded",
    applicationUrl: "https://cihr-irsc.gc.ca/f/493.html",
    description:
      "CIHR Fellowships support postdoctoral and doctoral researchers conducting health-related research at Canadian institutions. " +
      "Funding covers salary support for training in biomedical, clinical, health systems, and population health research.",
    eligibleRegions: ["africa", "developing"],
  },
  {
    externalId: "educanada-idrc-research-awards",
    title: "IDRC Research Awards",
    organizationName: "International Development Research Centre (IDRC)",
    country: "Canada",
    hostCountry: "Canada",
    degreeLevel: "master",
    fieldOfStudy: "development research",
    fundingType: "fully_funded",
    applicationUrl: "https://www.idrc.ca/en/funding/idrc-research-awards-guiding-principles",
    description:
      "IDRC Research Awards offer graduate students and recent graduates from developing countries the opportunity to conduct research on international development topics in Canada. " +
      "Ethiopia is among eligible developing-country profiles for IDRC-funded research training.",
    eligibleRegions: ["africa", "developing"],
  },
  {
    externalId: "educanada-mitacs-elevate",
    title: "Mitacs Elevate",
    organizationName: "Mitacs",
    country: "Canada",
    hostCountry: "Canada",
    degreeLevel: "phd",
    fieldOfStudy: "applied research",
    fundingType: "fully_funded",
    applicationUrl: "https://www.mitacs.ca/our-programs/elevate/",
    description:
      "Mitacs Elevate is a postdoctoral fellowship pairing researchers with partner organizations on two-year collaborative R&D projects in Canada. " +
      "Provides a minimum CAD $55,000 annual stipend plus research and travel support for international and domestic postdocs.",
    eligibleRegions: ["africa", "developing"],
  },
  {
    externalId: "educanada-trudeau-doctoral",
    title: "Pierre Elliott Trudeau Foundation Doctoral Scholarships",
    organizationName: "Pierre Elliott Trudeau Foundation",
    country: "Canada",
    hostCountry: "Canada",
    degreeLevel: "phd",
    fieldOfStudy: "humanities and social sciences",
    fundingType: "fully_funded",
    applicationUrl: "https://thetrudeaufoundation.ca/scholarships-doctoral-scholarships/",
    description:
      "The Pierre Elliott Trudeau Foundation Doctoral Scholarships recognize outstanding doctoral candidates in humanities and social sciences whose research addresses critical social issues. " +
      "Provides generous funding, leadership training, and mentorship for up to three years of doctoral study in Canada.",
    eligibleRegions: ["africa", "developing"],
  },
];

function educanadaEthiopiaLeafProgrammes() {
  return buildLeafRecordsFromList(EDUCANADA_ETHIOPIA_PROGRAMMES);
}

module.exports = {
  EDUCANADA_ETHIOPIA_PROGRAMMES,
  educanadaEthiopiaLeafProgrammes,
};
