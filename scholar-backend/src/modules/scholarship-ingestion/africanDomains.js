const { hostnameFromUrl } = require("./govTrustedDomains");

/** Domains that indicate African-origin scholarship sources. */
const AFRICAN_SOURCE_DOMAINS = [
  "gov.et",
  "edu.et",
  "moe.gov.et",
  "ecsu.edu.et",
  "aastu.edu.et",
  "ac.ke",
  "uonbi.ac.ke",
  "education.go.ke",
  "jkf.co.ke",
  "go.ke",
  "edu.gh",
  "ug.edu.gh",
  "ucc.edu.gh",
  "moe.gov.gh",
  "edu.ng",
  "ui.edu.ng",
  "education.gov.ng",
  "dhet.gov.za",
  "nsfas.org.za",
  "aasciences.africa",
  "au.int",
  "africa-union.org",
  "opportunityportal.africa",
  "afterschoolafrica.com",
  "scholarshipsfordevelopment.com",
  "opportunitydesk.org",
];

const AFRICAN_TLD_SUFFIXES = [".ac.ke", ".edu.gh", ".edu.ng", ".edu.et", ".gov.et", ".africa"];

function isAfricanSourceDomain(url) {
  const host = hostnameFromUrl(url);
  if (!host) return false;
  if (AFRICAN_SOURCE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) {
    return true;
  }
  return AFRICAN_TLD_SUFFIXES.some((suffix) => host.endsWith(suffix));
}

module.exports = {
  AFRICAN_SOURCE_DOMAINS,
  isAfricanSourceDomain,
};
