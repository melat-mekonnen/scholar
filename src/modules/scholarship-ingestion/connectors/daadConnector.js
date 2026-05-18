const curatedDaadScholarships = [
  {
    externalId: "daad-epos-postgraduate",
    title: "DAAD EPOS Development-Related Postgraduate Courses",
    organizationName: "DAAD",
    country: "Germany",
    degreeLevel: "masters",
    fieldOfStudy: "development studies",
    fundingType: "fully_funded",
    deadline: null,
    amount: "Varies by programme",
    description:
      "DAAD EPOS supports development-related postgraduate studies at selected German universities.",
    applicationUrl:
      "https://www.daad.de/en/study-and-research-in-germany/scholarships/database-of-international-programmes/",
    sourceUrl:
      "https://www.daad.de/en/study-and-research-in-germany/scholarships/database-of-international-programmes/",
  },
  {
    externalId: "daad-in-region-east-africa",
    title: "DAAD In-Region Scholarship Programme for East Africa",
    organizationName: "DAAD",
    country: "Ethiopia",
    degreeLevel: "masters",
    fieldOfStudy: "engineering",
    fundingType: "fully_funded",
    deadline: null,
    amount: "Monthly stipend and research support",
    description:
      "Scholarship opportunities through DAAD-supported partner programmes in East Africa.",
    applicationUrl:
      "https://www.daad.de/en/study-and-research-in-germany/scholarships/",
    sourceUrl: "https://www.daad.de/en/study-and-research-in-germany/scholarships/",
  },
];

async function fetchDaadScholarships() {
  return curatedDaadScholarships;
}

module.exports = { fetchDaadScholarships };
