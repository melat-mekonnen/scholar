const test = require("node:test");
const assert = require("node:assert/strict");

const { mapPublicScholarship } = require("../../src/utils/mapPublicOpportunity");

function sampleRow(overrides = {}) {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    record_type: "scholarship",
    title: "Fulbright Foreign Student Program",
    title_am: "ፉልብራይት",
    organization_name: "Fulbright",
    country: "United States",
    host_country: "United States",
    degree_level: "master",
    field_of_study: "Computer Science",
    funding_type: "fully_funded",
    deadline: "2027-03-15",
    application_start_date: "2026-10-01",
    application_end_date: "2027-03-15",
    amount: "Full tuition + stipend",
    description: "## Overview\n\nA scholarship for graduate study.",
    description_am: "## አጠቃላይ መግለጫ\n\nየከፍተኛ ትምህርት ስኮላርሺፕ።",
    application_url: "https://example.org/apply",
    application_status: "open",
    is_rolling: false,
    bookmark_count: 42,
    is_bookmarked: true,
    created_at: "2026-05-20T12:00:00.000Z",
    ...overrides,
  };
}

test("public scholarship mapper returns required browse card fields", () => {
  const mapped = mapPublicScholarship(sampleRow(), "en");

  assert.equal(mapped.id, "11111111-1111-4111-8111-111111111111");
  assert.equal(mapped.recordType, "scholarship");
  assert.equal(mapped.title, "Fulbright Foreign Student Program");
  assert.equal(mapped.organizationName, "Fulbright");
  assert.equal(mapped.country, "United States");
  assert.equal(mapped.degreeLevel, "master");
  assert.equal(mapped.fundingType, "fully_funded");
  assert.equal(mapped.deadline, "2027-03-15");
  assert.equal(mapped.startDate, "2026-10-01");
  assert.equal(mapped.endDate, "2027-03-15");
  assert.equal(mapped.isRolling, false);
  assert.equal(mapped.bookmarkCount, 42);
  assert.equal(mapped.isBookmarked, true);
  assert.equal(mapped.applicationUrl, "https://example.org/apply");
});

test("public scholarship mapper localizes title/description with fallback", () => {
  const amMapped = mapPublicScholarship(sampleRow(), "am");
  assert.equal(amMapped.title, "ፉልብራይት");
  assert.equal(amMapped.description, "## አጠቃላይ መግለጫ\n\nየከፍተኛ ትምህርት ስኮላርሺፕ።");

  const fallbackMapped = mapPublicScholarship(
    sampleRow({ title_am: null, description_am: null }),
    "am",
  );
  assert.equal(fallbackMapped.title, "Fulbright Foreign Student Program");
  assert.equal(fallbackMapped.description, "## Overview\n\nA scholarship for graduate study.");
});

test("public scholarship mapper preserves plain-text description fallback", () => {
  const mapped = mapPublicScholarship(
    sampleRow({ description: "Plain text description without sections." }),
    "en",
  );
  assert.equal(mapped.description, "Plain text description without sections.");
});
