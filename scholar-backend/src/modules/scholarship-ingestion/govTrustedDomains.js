/**
 * Official / foundation domains eligible for government_trusted auto-verify tier.
 * Subdomains match automatically (e.g. www.chevening.org).
 */
const GOV_TRUSTED_DOMAINS = [
  "chevening.org",
  "cscuk.fcdo.gov.uk",
  "fcdo.gov.uk",
  "daad.de",
  "fulbrightonline.org",
  "us.fulbrightonline.org",
  "foreign.fulbrightonline.org",
  "eacea.ec.europa.eu",
  "erasmus-plus.ec.europa.eu",
  "ec.europa.eu",
  "studyinaustralia.gov.au",
  "dfat.gov.au",
  "international.gc.ca",
  "educationusa.state.gov",
  "state.gov",
  "oas.org",
  "mastercardfdn.org",
  "mastercardfoundation.org",
  "au.int",
  "africa-union.org",
  "isdb.org",
  "vliru.be",
  "campusfrance.org",
  "campusfrance.fr",
  "wellcome.org",
  "aku.edu",
  "agakhanfoundation.org",
  "britishcouncil.org",
  "gov.uk",
  "gov.au",
  "gov.ca",
  "gov.de",
  "gov.et",
  "edu.et",
  "australiaawards.gov.au",
  "education.gov.ng",
  "education.go.ke",
  "moe.gov.et",
  "go.ke",
  "moe.gov.gh",
  "dhet.gov.za",
  "nsfas.org.za",
  "jkf.co.ke",
  "uonbi.ac.ke",
  "ug.edu.gh",
  "ucc.edu.gh",
  "ui.edu.ng",
  "ecsu.edu.et",
  "aastu.edu.et",
  "aasciences.africa",
  "ashinaga.org",
  "mandelarhodes.org",
  "akdn.org",
  "akf.org.uk",
];

const AGGREGATOR_DOMAINS = [
  "fastweb.com",
  "www.fastweb.com",
  "scholarshipsfordevelopment.com",
  "afterschoolafrica.com",
  "opportunitydesk.org",
  "opportunityportal.africa",
];

const HUB_TITLE_BLOCKLIST = [
  /^scholarships?$/i,
  /^home$/i,
  /^study abroad$/i,
  /^funding opportunities$/i,
  /^scholarship listings?$/i,
  /^opportunities for individuals$/i,
  /^foreign fulbright program/i,
  /^apply$/i,
  /^scholars?$/i,
  /^scholars program$/i,
  /^elimu scholarship \d+$/i,
  /toto|casino|slot|bandar|togel|betting/i,
  /^department of higher education and training$/i,
  /^internationalscholarships\./i,
];

function hostnameFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isGovTrustedUrl(url) {
  const host = hostnameFromUrl(url);
  if (!host) return false;
  return GOV_TRUSTED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

function isAggregatorUrl(url) {
  const host = hostnameFromUrl(url);
  return AGGREGATOR_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

function resolveIngestionTier(record) {
  const url = record.sourceUrl || record.applicationUrl || "";
  if (isGovTrustedUrl(url)) return "government_trusted";
  if (isAggregatorUrl(url)) return "aggregator";
  return "other";
}

function isHubTitle(title) {
  const t = String(title || "").trim();
  if (t.length < 4) return true;
  return HUB_TITLE_BLOCKLIST.some((re) => re.test(t));
}

module.exports = {
  GOV_TRUSTED_DOMAINS,
  AGGREGATOR_DOMAINS,
  HUB_TITLE_BLOCKLIST,
  hostnameFromUrl,
  isGovTrustedUrl,
  isAggregatorUrl,
  resolveIngestionTier,
  isHubTitle,
};
