const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {
  parseListingPage,
  parseDetailPage,
  parseResultCount,
  buildFilterUrl,
  mapDegreeLevel,
  toImportRecord,
} = require("../src/modules/scholarship-ingestion/connectors/educationusaFinancialAidParser");

const FIXTURE_DIR = path.join(__dirname, "fixtures/educationusa");

describe("educationusaFinancialAidParser", () => {
  it("builds filter URLs with degree tid and pagination", () => {
    const url = buildFilterUrl({ degreeTid: "15" }, 2);
    assert.match(url, /field_scholarship_degree_levels_tid=15/);
    assert.match(url, /page=2/);
  });

  it("parses listing cards from filtered HTML", () => {
    const html = fs.readFileSync(path.join(FIXTURE_DIR, "listing-associate.html"), "utf8");
    assert.equal(parseResultCount(html), 33);
    const items = parseListingPage(html);
    assert.equal(items.length, 10);
    assert.equal(items[0].title, "Pierce College Merit Scholarship");
    assert.equal(items[0].path, "/scholarships/pierce-college-merit-scholarship");
    assert.equal(items[0].organizationName, "Pierce College District");
    assert.equal(items[1].deadlineText, "May 1");
  });

  it("parses scholarship detail fields and apply URL", () => {
    const html = fs.readFileSync(path.join(FIXTURE_DIR, "detail-maverick.html"), "utf8");
    const detail = parseDetailPage(
      html,
      "https://educationusa.state.gov/scholarships/global-maverick-access-scholarship",
    );
    assert.equal(detail.title, "Global Maverick Access Scholarship");
    assert.equal(detail.organizationName, "Minnesota State University, Mankato");
    assert.equal(detail.degreeLevel, "associate");
    assert.match(detail.applicationUrl, /mnsu\.edu/);
    assert.equal(detail.deadlineText, "May 1");
  });

  it("maps degree labels and produces import records", () => {
    assert.equal(mapDegreeLevel("Undergraduate - Bachelor's"), "bachelor");
    const record = toImportRecord({
      title: "Example Award",
      path: "/scholarships/example-award",
      sourceUrl: "https://educationusa.state.gov/scholarships/example-award",
      organizationName: "Example University",
      applicationUrl: "https://example.edu/apply",
      degreeLevel: "master",
      description: "A".repeat(100),
    });
    assert.equal(record.externalId, "edusa-example-award");
    assert.equal(record.country, "United States");
    assert.equal(record.degreeLevel, "master");
  });
});
