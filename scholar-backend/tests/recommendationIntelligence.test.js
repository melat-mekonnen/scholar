const test = require("node:test");
const assert = require("node:assert/strict");
const { evaluateProfileStrength } = require("../src/usecases/recommendations/profileStrengthEngine");
const { estimateCompetitiveness, estimateDifficulty } = require("../src/usecases/recommendations/competitivenessEngine");
const { rankScholarships } = require("../src/usecases/recommendations/hybridRanking");

test("evaluateProfileStrength returns excellent score and deterministic reasons for strong applicant", () => {
  const profile = {
    gpa: 3.9,
    ielts: 7.5,
    interests: ["volunteer", "research"],
    language_proficiency: ["English"],
    goals: "I led a team research project and published a conference paper.",
  };

  const result = evaluateProfileStrength(profile);

  assert.equal(result.label, "excellent");
  assert.equal(result.score, 100);
  assert.ok(result.reasons.some((reason) => reason.includes("GPA strength")));
  assert.ok(result.reasons.some((reason) => reason.includes("Language profile")));
  assert.ok(result.reasons.some((reason) => reason.includes("Research")));
});

test("estimateCompetitiveness and estimateDifficulty produce high label for elite funded scholarship", () => {
  const scholarship = {
    title: "Global Fellowship for Excellence",
    organization_name: "Prestigious University",
    description: "A fully funded elite research fellowship for international scholars.",
    funding_type: "Fully funded",
    amount: 100000,
    degree_level: "phd",
    country: "United States",
  };

  const competitiveness = estimateCompetitiveness(scholarship);
  const difficulty = estimateDifficulty(scholarship);

  assert.equal(competitiveness.label, "high");
  assert.ok(competitiveness.score >= 70);
  assert.equal(difficulty, "elite");
});

test("rankScholarships returns deterministic confidence reasons and explanations even when semantic score is zero", () => {
  const profile = {
    degree_level: "master",
    field_of_study: "Computer Science",
    gpa: 3.5,
    ielts: 7.0,
    interests: ["coding", "research"],
    goals: "Lead AI research at a top university.",
  };

  const scholarships = [
    {
      id: "scholarship-1",
      title: "Fully funded Master's scholarship in Canada",
      country: "Canada",
      degree_level: "master",
      field_of_study: "Computer Science",
      funding_type: "Fully funded",
      status: "verified",
      semanticScore: 0,
      deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      application_url: "https://example.com/apply",
      description: "Support for master's students in computer science.",
      amount: 52000,
    },
  ];

  const results = rankScholarships({
    scholarships,
    query: "master computer science scholarship",
    filters: { fieldsOfStudy: ["Computer Science"] },
    strictMode: false,
    studentProfile: profile,
    isPremium: false,
  });

  assert.equal(results.length, 1);
  const item = results[0];
  assert.equal(item.id, "scholarship-1");
  assert.ok(typeof item.recommendationConfidence === "number");
  assert.ok(Array.isArray(item.confidenceReasons));
  assert.ok(item.confidenceReasons.length >= 4);
  assert.ok(Array.isArray(item.explanations));
  assert.ok(item.explanations.length >= 1);
  assert.ok(item.explanations.some((explanation) => explanation.includes("Field matches directly") || explanation.includes("Excellent funding alignment") || explanation.includes("Scholarship is highly competitive") || explanation.includes("Strong GPA alignment")));
});

test("rankScholarships applies competitiveness penalty for high competition and weaker profile", () => {
  const profile = {
    degree_level: "bachelor",
    field_of_study: "Economics",
    gpa: 2.6,
    interests: ["sports"],
    goals: "I want to study abroad and explore new opportunities.",
  };

  const scholarships = [
    {
      id: "high-competition",
      title: "Elite Global Fellowship",
      country: "United States",
      degree_level: "phd",
      field_of_study: "Economics",
      funding_type: "Fully funded",
      status: "verified",
      semanticScore: 0.8,
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      application_url: "https://example.com/apply",
      description: "A prestigious fellowship for distinguished applicants.",
      amount: 95000,
    },
  ];

  const [result] = rankScholarships({
    scholarships,
    query: "elite phd fellowship",
    filters: {},
    strictMode: false,
    studentProfile: profile,
    isPremium: false,
  });

  assert.equal(result.competitiveness, "high");
  assert.ok(result.competitivenessScore >= 70);
  assert.ok(result.competitivenessPenalty >= 0.04);
  assert.ok(Array.isArray(result.confidenceReasons));
  assert.ok(result.confidenceReasons.includes("Profile strength may need improvement") || result.confidenceReasons.includes("Eligibility score is limited"));
});
