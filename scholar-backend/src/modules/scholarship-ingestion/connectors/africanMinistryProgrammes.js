/**
 * Curated single-programme URLs (not listing hubs).
 * Each entry becomes one scholarship card after ingest.
 */
const AFRICAN_MINISTRY_PROGRAMME_URLS = {
  kenya: [
    {
      url: "https://www.jkf.co.ke/index.php/scholarships",
      titleHint: "ELIMU & Jomo Kenyatta Foundation Scholarships — Kenya",
      organizationName: "Ministry of Education — Kenya / Jomo Kenyatta Foundation",
      externalId: "ke-jkf-scholarships",
    },
  ],
  nigeria: [
    {
      url: "https://education.gov.ng/federal-scholarships-board/",
      titleHint: "Federal Scholarships Board (FSB) — Nigeria",
      organizationName: "Federal Ministry of Education — Nigeria",
      externalId: "ng-education-fsb",
    },
  ],
  ghana: [],
  ethiopia: [],
  south_africa: [
    {
      url: "https://www.nsfas.org.za/content/how-it-works.html",
      titleHint: "NSFAS Financial Aid for South African Students",
      organizationName: "National Student Financial Aid Scheme — South Africa",
      externalId: "za-nsfas-how-it-works",
    },
  ],
};

/**
 * Rough catalogue of government / official scholarship sources wired in Scholar.
 * Not exhaustive globally — see ingest sourceRegistry for live connectors.
 */
const GOVERNMENT_SCHOLARSHIP_SOURCE_COUNTRIES = {
  wiredInScholar: [
    { country: "Ethiopia", type: "ministry", url: "https://www.moe.gov.et" },
    { country: "Kenya", type: "ministry + JKF", url: "https://www.education.go.ke" },
    { country: "Nigeria", type: "ministry", url: "https://education.gov.ng" },
    { country: "Ghana", type: "ministry", url: "https://moe.gov.gh" },
    { country: "South Africa", type: "DHET + NSFAS", url: "https://www.dhet.gov.za" },
    { country: "United Kingdom", type: "Chevening + Commonwealth", url: "https://www.chevening.org" },
    { country: "Germany", type: "DAAD", url: "https://www.daad.de" },
    { country: "Australia", type: "Australia Awards", url: "https://www.australiaawards.gov.au" },
    { country: "United States", type: "Fulbright", url: "https://foreign.fulbrightonline.org" },
    { country: "European Union", type: "Erasmus+", url: "https://erasmus-plus.ec.europa.eu" },
  ],
  /** Typical scale when crawlers run successfully (order of magnitude). */
  expectedProgrammesPerSource: {
    african_ministries: "5–25 individual posts per country",
    commonwealth: "8–12 named schemes",
    chevening: "1 main programme",
    australia_awards: "3–8 country programmes",
    daad: "5–15 (when reachable)",
    fulbright: "2–4 student programmes",
    erasmus: "2–5 hub pages",
  },
};

function programmeUrlsForSource(sourceKey) {
  return AFRICAN_MINISTRY_PROGRAMME_URLS[sourceKey] || [];
}

module.exports = {
  AFRICAN_MINISTRY_PROGRAMME_URLS,
  GOVERNMENT_SCHOLARSHIP_SOURCE_COUNTRIES,
  programmeUrlsForSource,
};
