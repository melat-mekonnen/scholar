const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isGenericBoilerplate,
  isPollutedDescription,
  isLowQualityTitle,
  isListingHubUrl,
  shouldAcceptEnrichedDescription,
  mergeDescription,
} = require("../src/modules/scholarship-ingestion/descriptionQuality");

test("isGenericBoilerplate detects Fulbright US student template", () => {
  const text =
    "The Fulbright U.S. Student Program provides grants for individually designed for U.S. graduating seniors";
  assert.equal(isGenericBoilerplate(text), true);
});

test("shouldAcceptEnrichedDescription rejects boilerplate overwrite", () => {
  const existing = "DAAD EPOS funds development-related postgraduate courses at German universities.";
  const incoming =
    "The Fulbright U.S. Student Program provides grants for individually designed for U.S. graduating seniors";
  assert.equal(shouldAcceptEnrichedDescription(existing, incoming), false);
});

test("isPollutedDescription detects WordPress 404 text", () => {
  const text =
    "The page you requested could not be found. Try refining your search, or use the navigation above to locate the post.";
  assert.equal(isPollutedDescription(text), true);
});

test("isPollutedDescription detects concatenated ministry listings", () => {
  const text = `CALL FOR APPLICATIONS TO THE COLOMBIA SCHOLARSHIPS PROGRAMME (BECA COLOMBIA 2026)
PARTIALLY FUNDED SCHOLARSHIP PROGRAMMES FOR TERM III MAY INTAKE
PROVISION OF TUITION FREE PLACES FOR STUDIES AT THE
MINISTRY OF FINANCE AND COMMERCE (MOFCOM) SCHOLARSHIP –
"STUDY IN ALGERIA" FOR PROSPECTIVE STUDENTS SEEKING`;
  assert.equal(isPollutedDescription(text), true);
});

test("isPollutedDescription detects repeated ministry homepage paragraphs", () => {
  const line =
    "FDRE Ministry of Education is a Governmental Organization Headquartered in Arada sub-city, Addis Ababa, Ethiopia.";
  const text = [line, line, line, "Some unrelated news about EdTech week."].join("\n\n");
  assert.equal(isPollutedDescription(text), true);
});

test("isNonProgrammeHubUrl rejects language landing pages", () => {
  const { isNonProgrammeHubUrl } = require("../src/modules/scholarship-ingestion/descriptionQuality");
  assert.equal(isNonProgrammeHubUrl("https://www.moe.gov.et/en"), true);
  assert.equal(
    isNonProgrammeHubUrl("https://education.gov.ng/federal-government-scholarship-awards/"),
    false,
  );
});

test("isLowQualityTitle rejects archive listing titles", () => {
  assert.equal(
    isLowQualityTitle("Scholarships Archive - Page 2 of 2 - Commonwealth Scholarship Commission"),
    true,
  );
});

test("isListingHubUrl rejects category and index pages", () => {
  assert.equal(isListingHubUrl("https://www.education.go.ke/index.php/scholarships"), true);
  assert.equal(
    isListingHubUrl("https://education.gov.ng/category/scholarships-opportunities/"),
    true,
  );
  assert.equal(
    isListingHubUrl("https://education.gov.ng/federal-government-scholarship-awards/"),
    false,
  );
});

test("mergeDescription filters junk and keeps programme text", () => {
  const out = mergeDescription({
    intro: "The Fulbright U.S. Student Program provides grants",
    paragraphs: [
      "Chevening Scholarships are the UK government's global programme for future leaders from eligible countries. Awards fund one-year master's degrees at UK universities with full tuition, stipend, and travel.",
    ],
    bullets: ["Increase Text Decrease Text Grayscale"],
  });
  assert.ok(out.includes("Chevening"));
  assert.ok(!out.includes("Fulbright U.S. Student"));
});
