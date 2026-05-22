const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveOfficialProgrammeUrl,
  scoreOfficialCandidate,
  shouldSkipOutboundUrl,
} = require("../src/modules/scholarship-ingestion/connectors/resolveOfficialProgrammeUrl");

const ARTICLE = "https://www.uscholarships.us/example-fulbright-grant";

test("resolveOfficialProgrammeUrl prefers gov-trusted outbound links", () => {
  const html = `
    <p>See also on <a href="https://www.fastweb.com/college-scholarships/123">Fastweb</a></p>
    <p><a href="https://foreign.fulbrightonline.org/about/foreign-student-program">Official Fulbright site</a></p>
    <p><a href="https://educationusa.state.gov/">EducationUSA</a></p>
  `;

  const resolved = resolveOfficialProgrammeUrl(html, ARTICLE);
  assert.ok(resolved);
  assert.ok(
    resolved.url.includes("fulbrightonline.org") || resolved.url.includes("state.gov"),
  );
  assert.ok(resolved.score >= 100);
});

test("resolveOfficialProgrammeUrl skips blocklisted aggregator domains", () => {
  const html = `
    <a href="https://scholarshipunion.com/some-listing">More info</a>
    <a href="https://scholarshiptab.com/post/example">Tab listing</a>
    <a href="https://www.uscholarships.us/other-article">Another article</a>
  `;

  const resolved = resolveOfficialProgrammeUrl(html, ARTICLE);
  assert.equal(resolved, null);
});

test("resolveOfficialProgrammeUrl accepts .edu programme pages", () => {
  const html = `
    <a href="https://financialaid.stanford.edu/scholarships/undergraduate/">Stanford Financial Aid</a>
  `;

  const resolved = resolveOfficialProgrammeUrl(html, ARTICLE);
  assert.ok(resolved);
  assert.match(resolved.url, /stanford\.edu/);
  assert.ok(resolved.score >= 80);
});

test("resolveOfficialProgrammeUrl rejects generic .edu about pages", () => {
  const html = `
    <a href="https://www.uis.edu/about/history-and-traditions">University history</a>
    <a href="https://www.uis.edu/admissions-aid/scholarships/">Scholarships</a>
  `;

  const resolved = resolveOfficialProgrammeUrl(html, ARTICLE);
  assert.ok(resolved);
  assert.match(resolved.url, /scholarships/);
});

test("scoreOfficialCandidate boosts apply/official anchor text", () => {
  const plain = scoreOfficialCandidate("https://example.org/grants/abc", "");
  const labeled = scoreOfficialCandidate(
    "https://example.org/grants/abc",
    "Visit the official website to apply",
  );
  assert.ok(labeled > plain);
});

test("shouldSkipOutboundUrl rejects social and aggregator hosts", () => {
  assert.equal(shouldSkipOutboundUrl("https://facebook.com/share", ARTICLE), true);
  assert.equal(shouldSkipOutboundUrl("https://scholarshiptab.com/post/x", ARTICLE), true);
  assert.equal(shouldSkipOutboundUrl("https://www.harvard.edu/financial-aid", ARTICLE), false);
});
