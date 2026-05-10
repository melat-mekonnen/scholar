const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isStrictQuery,
  buildStrictQueryText,
  matchesStrictQuery,
  rankScholarships,
} = require("../src/usecases/recommendations/hybridRanking");

test("strict query detection recognizes exact and only operators", () => {
  assert.equal(isStrictQuery("fully funded masters in japan"), false);
  assert.equal(isStrictQuery("must be fully funded in Canada"), true);
  assert.equal(isStrictQuery("only scholarships for women in stem"), true);
  assert.equal(isStrictQuery("exact phd matches"), true);
});

test("buildStrictQueryText removes strict operators", () => {
  assert.equal(buildStrictQueryText("must be fully funded in canada"), "be fully funded in canada");
  assert.equal(buildStrictQueryText("exact scholarship for women only"), "scholarship for women");
});

test("matchesStrictQuery filters scholarship text by strict terms", () => {
  const scholarship = {
    title: "Fully funded undergraduate scholarship in Canada",
    description: "Open to women in STEM.",
    country: "Canada",
    funding_type: "Fully funded",
    degree_level: "undergraduate",
    field_of_study: "STEM",
  };

  assert.equal(matchesStrictQuery(scholarship, buildStrictQueryText("only fully funded scholarships in canada")), true);
  assert.equal(matchesStrictQuery(scholarship, buildStrictQueryText("must be for germany")), false);
});

test("rankScholarships boosts fully funded Japan masters for a matching query", () => {
  const scholarships = [
    {
      id: "1",
      title: "Masters scholarship in Japan",
      country: "Japan",
      degree_level: "master",
      field_of_study: "Engineering",
      funding_type: "partially funded",
      status: "verified",
      semanticScore: 0.85,
      deadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      application_url: "https://example.com/apply",
      description: "Scholarship for science and engineering students.",
    },
    {
      id: "2",
      title: "Fully funded Master's scholarship in Japan",
      country: "Japan",
      degree_level: "master",
      field_of_study: "Computer Science",
      funding_type: "Fully funded",
      status: "verified",
      semanticScore: 0.8,
      deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      application_url: "https://example.com/apply",
      description: "Support for women in STEM and technology.",
    },
    {
      id: "3",
      title: "PhD scholarship in Germany",
      country: "Germany",
      degree_level: "phd",
      field_of_study: "Science",
      funding_type: "Fully funded",
      status: "verified",
      semanticScore: 0.9,
      deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      application_url: "https://example.com/apply",
      description: "PhD funding for international research applicants.",
    },
  ]; 

  const results = rankScholarships({
    scholarships,
    query: "fully funded masters in japan",
    filters: {},
    strictMode: false,
  });

  assert.equal(results[0].id, "2");
  assert.ok(results[0].finalScore >= results[1].finalScore);
  assert.ok(results[0].rankingReasons.includes("Country matched Japan"));
  assert.ok(results[0].rankingReasons.includes("Matches fully funded intent"));
});

