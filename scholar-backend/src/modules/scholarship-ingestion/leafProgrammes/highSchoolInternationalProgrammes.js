/**
 * Tier 1–2 official high-school exchange and scholarship programmes for international students.
 * Apply URLs must be programme-specific pages (not aggregator directories).
 */
const { buildLeafRecordsFromList } = require("./buildLeafProgrammeRecord");

const HIGH_SCHOOL_LEAF_PROGRAMMES = [
  {
    externalId: "assist-scholars-us-high-school",
    title: "ASSIST Scholars Program",
    organizationName: "ASSIST Scholars",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "high_school",
    fieldOfStudy: "secondary education",
    fundingType: "fully_funded",
    amount: "One-year scholarship to a leading U.S. or Canadian private high school",
    applicationUrl: "https://www.assistscholars.org/en/scholarship/apply/",
    sourceUrl: "https://www.assistscholars.org/en/scholarship/",
    isRolling: true,
    eligibleRegions: ["africa", "developing"],
    description:
      "ASSIST Scholars places outstanding international students in competitive one-year placements at leading private high schools in the United States and Canada. " +
      "Scholarships cover the exchange year; candidates are typically in grades 9–11, proficient in English, and strong academically and as community members. " +
      "Applications open annually in July with priority deadlines around December 1 for most countries (earlier for some European countries). " +
      "Ethiopian and other African students apply through the official ASSIST application portal (assistscholars.fsenrollment.com) and country guidance pages.",
  },
  {
    externalId: "davis-international-scholars-assist",
    title: "Davis International Scholars Program",
    organizationName: "ASSIST Scholars (Davis International Scholars)",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "high_school",
    fieldOfStudy: "secondary education",
    fundingType: "fully_funded",
    amount: "Need-based funding for tuition, room, and board at partner boarding schools",
    applicationUrl: "https://www.assistscholars.org/en/scholarship/apply/",
    sourceUrl: "https://www.assistscholars.org/en/scholarship/apply/",
    isRolling: true,
    eligibleRegions: ["africa", "developing"],
    description:
      "The Davis International Scholars Program provides substantial need-based funding for international students attending ASSIST partner boarding schools in the United States. " +
      "Awards can cover much of tuition, room, and board depending on family need. Candidates apply through the same ASSIST Scholars application and may be considered alongside ASSIST and related partner awards. " +
      "Designed for motivated students seeking a rigorous U.S. boarding school experience with significant financial support.",
  },
  {
    externalId: "uwc-international-ib-diploma",
    title: "United World Colleges (UWC) — International Application",
    organizationName: "United World Colleges",
    country: "International",
    hostCountry: "International",
    degreeLevel: "high_school",
    fieldOfStudy: "International Baccalaureate (IB Diploma)",
    fundingType: "fully_funded",
    amount: "Need-based full or partial scholarships at UWC schools worldwide",
    applicationUrl: "https://www.uwc.org/apply/how-to-apply/",
    sourceUrl: "https://www.uwc.org/apply/how-to-apply/",
    isRolling: true,
    eligibleRegions: ["africa", "developing"],
    description:
      "United World Colleges offers the two-year International Baccalaureate Diploma Programme at schools and colleges around the world, with deliberate diversity and need-based financial aid. " +
      "Students aged roughly 15–19 apply through a UWC national committee in their country or through the global application route where available. " +
      "Scholarships can cover tuition and living costs based on need; many Ethiopian students have attended UWC through the Ethiopia national committee. " +
      "Check the official UWC site for open application cycles and national committee contacts.",
  },
  {
    externalId: "uwc-ethiopia-national-committee",
    title: "UWC Ethiopia National Committee Scholarships",
    organizationName: "UWC Ethiopia National Committee",
    country: "Ethiopia",
    hostCountry: "International",
    degreeLevel: "high_school",
    fieldOfStudy: "International Baccalaureate (IB Diploma)",
    fundingType: "fully_funded",
    amount: "Need-based UWC placement scholarships (full or partial)",
    applicationUrl: "https://et.uwc.org/how-to-apply/",
    sourceUrl: "https://et.uwc.org/about-uwc-nc-name/",
    isRolling: true,
    eligibleRegions: ["africa"],
    description:
      "The UWC Ethiopia National Committee selects Ethiopian students for the International Baccalaureate Diploma at UWC schools worldwide. " +
      "Applicants must meet committee eligibility (including Ethiopian citizenship or permanent residency and applying only through this committee). " +
      "The process includes written applications, interviews, and need-based scholarship assessment; a significant share of selected students receive full or partial funding. " +
      "Monitor the UWC Ethiopia website and official application portal when recruitment opens for upcoming intake years.",
  },
  {
    externalId: "kennedy-lugar-yes-inbound",
    title: "Kennedy-Lugar Youth Exchange and Study (YES) Program",
    organizationName: "U.S. Department of State — YES Program",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "high_school",
    fieldOfStudy: "secondary education / cultural exchange",
    fundingType: "fully_funded",
    amount: "Fully funded academic year at a U.S. high school with host family",
    applicationUrl: "https://www.yesprograms.org/countries",
    sourceUrl: "https://www.yesprograms.org/countries",
    isRolling: true,
    eligibleRegions: ["africa", "developing"],
    description:
      "The Kennedy-Lugar Youth Exchange and Study (YES) program offers merit-based scholarships for secondary school students from partner countries to spend one academic year in the United States. " +
      "Participants attend a U.S. high school, live with a volunteer host family, and engage in leadership and civic activities. " +
      "Recruitment is organized by country; students from eligible countries (including Ethiopia when the cycle is open) apply through the official YES country portal linked from yesprograms.org. " +
      "Check the site for current application status and country-specific deadlines.",
  },
  {
    externalId: "flex-future-leaders-exchange",
    title: "Future Leaders Exchange (FLEX) Program",
    organizationName: "U.S. Department of State — FLEX (American Councils)",
    country: "United States",
    hostCountry: "United States",
    degreeLevel: "high_school",
    fieldOfStudy: "secondary education / cultural exchange",
    fundingType: "fully_funded",
    amount: "Fully funded U.S. high school year with host family",
    applicationUrl: "https://www.americancouncils.org/programs/future-leaders-exchange-flex-program",
    sourceUrl: "https://www.discoverflex.org/",
    isRolling: true,
    eligibleRegions: ["developing"],
    description:
      "FLEX is a highly competitive, fully funded U.S. high school exchange for students from participating countries in Europe and Eurasia. " +
      "Scholarship winners live with a host family and attend a U.S. high school for one academic year. " +
      "Eligibility is limited to citizens of designated FLEX countries (Ethiopia is not currently listed); Ethiopian students should prioritize YES, UWC, and ASSIST. " +
      "Apply only through discoverflex.org when recruitment is open in an eligible home country.",
  },
  {
    externalId: "afs-high-school-study-abroad",
    title: "AFS Intercultural Programs — High School Study Abroad",
    organizationName: "AFS Intercultural Programs",
    country: "International",
    hostCountry: "International",
    degreeLevel: "high_school",
    fieldOfStudy: "secondary education / exchange",
    fundingType: "partially_funded",
    amount: "Program fees vary; limited scholarships and financial aid by country",
    applicationUrl: "https://www.afs.org/programs/high-school-study-abroad/",
    sourceUrl: "https://www.afs.org/programs/high-school-study-abroad/",
    isRolling: true,
    eligibleRegions: ["africa", "developing"],
    description:
      "AFS offers intercultural exchange and study-abroad opportunities for secondary-school students, including year and semester programs in many host countries. " +
      "Funding is typically partial; some national AFS offices offer scholarships or fee reductions based on merit and need. " +
      "Students apply through their local AFS organization with programme-specific deadlines and eligibility. " +
      "Use the official AFS high school study abroad page to find opportunities available from Ethiopia or your country of residence.",
  },
  {
    externalId: "ics-addis-high-school-scholarship",
    title: "ICS Addis Ababa High School Scholarship (Grade 9)",
    organizationName: "International Community School of Addis Ababa",
    country: "Ethiopia",
    hostCountry: "Ethiopia",
    degreeLevel: "high_school",
    fieldOfStudy: "secondary education",
    fundingType: "fully_funded",
    amount: "Merit and need-based scholarship for four-year high school",
    applicationUrl: "https://www.icsaddis.edu.et/admissions",
    sourceUrl: "https://www.icsaddis.edu.et/admissions",
    isRolling: true,
    eligibleRegions: ["africa"],
    description:
      "International Community School (ICS) Addis Ababa offers merit and need-based scholarships for Ethiopian students entering Grade 9. " +
      "Awards can support a four-year high school pathway at ICS with competitive selection, often including entrance assessment. " +
      "Application timing is typically in the March–April window before the academic year; confirm current deadlines and requirements on the official ICS admissions page. " +
      "This is a local international-school scholarship rather than an overseas exchange programme.",
  },
];

function highSchoolInternationalLeafProgrammes() {
  return buildLeafRecordsFromList(HIGH_SCHOOL_LEAF_PROGRAMMES);
}

/** Optional scrape entries (none currently — all high-school sources are leaf records). */
const HIGH_SCHOOL_SCRAPE_PROGRAMMES = [];
const HIGH_SCHOOL_CURATED_DESCRIPTIONS = {};

module.exports = {
  HIGH_SCHOOL_LEAF_PROGRAMMES,
  HIGH_SCHOOL_SCRAPE_PROGRAMMES,
  HIGH_SCHOOL_CURATED_DESCRIPTIONS,
  highSchoolInternationalLeafProgrammes,
};
