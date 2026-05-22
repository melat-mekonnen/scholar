const { isBareHomepageUrl } = require("../descriptionQuality");

const CSC_SHARED_SCHEME =
  "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-shared-scholarships/";

/** Leaf funding pages for Shared Scholarship university placements (not homepages). */
const SHARED_SCHOLARSHIP_LEAF_URLS = {
  bournemouth: "https://www.bournemouth.ac.uk/study/fees-funding/scholarships",
  brunel:
    "https://www.brunel.ac.uk/study/admissions/funding/scholarships-bursaries/postgraduate-scholarships",
  "harper-adams": "https://www.harper-adams.ac.uk/postgraduate/fees-and-funding/scholarships/",
  kcl: "https://www.kcl.ac.uk/study/postgraduate/fees-and-funding/scholarships",
  lancaster:
    "https://www.lancaster.ac.uk/study/postgraduate/fees-and-funding/scholarships-and-funding/",
  "liverpool-hope":
    "https://www.hope.ac.uk/international/postgraduate/fees-funding-and-scholarships/scholarships/",
  lstmed: "https://www.lstmed.ac.uk/study/fees-funding/scholarships",
  newcastle: "https://www.ncl.ac.uk/postgraduate/fees-funding/scholarships/",
  rgu: "https://www.rgu.ac.uk/study/funding",
  soas: "https://www.soas.ac.uk/study/international/fees-and-funding/scholarships",
  aberdeen:
    "https://www.abdn.ac.uk/study/international/fees-funding-scholarships/postgraduate-taught/",
  bath: "https://www.bath.ac.uk/topics/scholarships/",
  bristol: "https://www.bristol.ac.uk/study/finance/scholarships/",
  cambridge: "https://www.cambridgetrust.org/scholarships",
  chester: "https://www.chester.ac.uk/study/fees-and-funding/scholarships",
  exeter: "https://www.exeter.ac.uk/study/fees/scholarships/",
  liverpool: "https://www.liverpool.ac.uk/international/fees-and-scholarships/postgraduate/",
  oxford:
    "https://www.ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/scholarships",
  sussex: "https://www.ids.ac.uk/study/fees-and-funding/scholarships/",
};

function resolveSharedUniversityUrl(entry) {
  if (SHARED_SCHOLARSHIP_LEAF_URLS[entry.slug]) {
    return SHARED_SCHOLARSHIP_LEAF_URLS[entry.slug];
  }
  const candidate = entry.website;
  if (candidate && !isBareHomepageUrl(candidate)) return candidate;
  return CSC_SHARED_SCHEME;
}

module.exports = {
  SHARED_SCHOLARSHIP_LEAF_URLS,
  resolveSharedUniversityUrl,
};
