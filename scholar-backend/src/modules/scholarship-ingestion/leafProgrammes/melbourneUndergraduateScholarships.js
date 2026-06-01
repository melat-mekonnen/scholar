/**
 * University of Melbourne undergraduate scholarships open to international students.
 * Sourced from the official scholarship search (open for applications).
 * @see https://scholarships.unimelb.edu.au/search?f.Student+type%7CstudentType=international+students&f.Application+status%7CapplicationStatus=open+for+applications&f.Level+of+study%7ClevelOfStudy=undergraduate
 */
const { buildLeafRecordsFromList } = require("./buildLeafProgrammeRecord");

const MELBOURNE_UG_BASE = "https://scholarships.unimelb.edu.au/awards";

/** First page + additional open international undergraduate awards (individual pages, not hubs). */
const MELBOURNE_INTERNATIONAL_UNDERGRADUATE = [
  { slug: "indonesian-talent-scholarship", title: "Indonesian Talent Scholarship", amount: "Full undergraduate support" },
  { slug: "ormond-college-scholarships", title: "Ormond College Scholarships", amount: "$5,000 - $36,000" },
  { slug: "trinity-college-scholarships", title: "Trinity College Scholarships", amount: "$5,000 - $120,000" },
  { slug: "queens-college-scholarships", title: "Queen's College Scholarships", amount: "Up to $38,000" },
  { slug: "international-house-scholarships", title: "International House Scholarships", amount: "Up to $22,500" },
  { slug: "airwallex-opportunity-grants", title: "Airwallex Opportunity Grants", amount: "Up to $5,000" },
  { slug: "university-college-scholarships", title: "University College Scholarships", amount: "$5,000 - $20,000" },
  { slug: "housing-bursary", title: "Housing Bursary", amount: "Up to $4,000" },
  { slug: "schubert-bursary", title: "Schubert Bursary", amount: "Up to $350" },
  { slug: "rotary-club-of-carlton-award", title: "Rotary Club of Carlton Award", amount: "Up to $2,000" },
  { slug: "dick-bursary", title: "Dick Bursary", amount: "Up to $1,000" },
  { slug: "art-supporters-collective-award", title: "Art Supporters Collective Award", amount: "Up to $500" },
  {
    slug: "melbourne-international-undergraduate-scholarship",
    title: "Melbourne International Undergraduate Scholarship",
    amount: "Full tuition remission (100%)",
  },
  {
    slug: "ag-whitlam-international-undergraduate-merit-scholarship",
    title: "AG Whitlam International Undergraduate Scholarship",
    amount: "Merit award for Bachelor of Commerce",
  },
  {
    slug: "international-undergraduate-merit-scholarships",
    title: "Commerce Undergraduate International Merit Scholarships",
    amount: "Merit award for Bachelor of Commerce",
  },
  {
    slug: "bachelor-of-commerce-global-scholarship",
    title: "Commerce Global Scholarship",
    amount: "Merit award for under-represented countries",
  },
  {
    slug: "melbourne-chancellors-scholarship",
    title: "Melbourne Chancellor's Scholarship",
    amount: "50% tuition fee sponsorship",
  },
];

function melbourneDescription({ title, amount }) {
  return (
    `${title} at the University of Melbourne for international undergraduate students. ` +
    `Funding: ${amount}. Applications are open on the official University of Melbourne scholarships portal. ` +
    `Review eligibility, value, and how to apply on the linked award page before submitting an application.`
  );
}

function melbourneUndergraduateLeafProgrammes() {
  return buildLeafRecordsFromList(
    MELBOURNE_INTERNATIONAL_UNDERGRADUATE.map((entry) => ({
      externalId: `melbourne-ug-${entry.slug}`,
      title: entry.title,
      organizationName: "University of Melbourne",
      country: "Australia",
      hostCountry: "Australia",
      degreeLevel: "bachelor",
      fieldOfStudy: "multiple disciplines",
      fundingType: entry.amount.toLowerCase().includes("full") ? "fully_funded" : "partially_funded",
      amount: entry.amount,
      url: `${MELBOURNE_UG_BASE}/${entry.slug}`,
      description: melbourneDescription(entry),
      eligibleRegions: ["africa", "developing", "international"],
      isRolling: true,
    })),
  );
}

module.exports = {
  MELBOURNE_INTERNATIONAL_UNDERGRADUATE,
  melbourneUndergraduateLeafProgrammes,
};
