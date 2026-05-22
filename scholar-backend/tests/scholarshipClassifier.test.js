const test = require("node:test");
const assert = require("node:assert/strict");
const { classifyScholarshipRecord } = require("../src/modules/scholarship-ingestion/scholarshipClassifier");

const base = {
  title: "Chevening Scholarships for Master's Study in the UK",
  country: "United Kingdom",
  applicationUrl: "https://www.chevening.org/apply/",
  sourceUrl: "https://www.chevening.org/scholarships/chevening-scholarships/",
  description:
    "Fully funded UK government scholarship for international students. Eligibility includes bachelor's degree and work experience. Application deadline listed on the official site. Apply online through the Chevening portal.",
  fundingType: "fully_funded",
  degreeLevel: "master",
};

test("classifyScholarshipRecord accepts real programme", () => {
  const r = classifyScholarshipRecord(base);
  assert.equal(r.reject, false);
});

test("classifyScholarshipRecord rejects archive navigation pages", () => {
  const r = classifyScholarshipRecord({
    ...base,
    title: "By Country Archives",
    description: "Browse scholarships by country on our blog.",
  });
  assert.equal(r.reject, true);
});

test("classifyScholarshipRecord rejects advertise pages", () => {
  const r = classifyScholarshipRecord({
    ...base,
    title: "Why Advertise on afterSchoolAfrica?",
    applicationUrl: "https://www.afterschoolafrica.com/advertise",
  });
  assert.equal(r.reject, true);
});
