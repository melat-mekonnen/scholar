const test = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveFieldCategory,
  fieldCategoryLabel,
  ALLOWED_FIELD_CATEGORIES,
} = require("../src/utils/fieldCategory");

test("resolveFieldCategory maps curated programme fields to categories", () => {
  assert.equal(
    resolveFieldCategory({
      fieldOfStudy: "approved master's courses at participating uk universities",
    }),
    "general",
  );
  assert.equal(resolveFieldCategory({ fieldOfStudy: "public health" }), "public_health");
  assert.equal(resolveFieldCategory({ fieldOfStudy: "data science" }), "data_science");
  assert.equal(
    resolveFieldCategory({ fieldOfStudy: "international development" }),
    "international_development",
  );
});

test("resolveFieldCategory uses title for Chevening themes", () => {
  assert.equal(
    resolveFieldCategory({
      fieldOfStudy: "strengthening global peace, security and governance",
    }),
    "international_development",
  );
});

test("resolveFieldCategory defaults PhD without match to research", () => {
  assert.equal(
    resolveFieldCategory({ fieldOfStudy: "custom topic", degreeLevel: "phd" }),
    "research",
  );
});

test("fieldCategoryLabel returns human-readable labels", () => {
  assert.equal(fieldCategoryLabel("data_science"), "Data science & analytics");
  assert.equal(fieldCategoryLabel("unknown_slug"), "unknown slug");
});

test("ALLOWED_FIELD_CATEGORIES includes general", () => {
  assert.ok(ALLOWED_FIELD_CATEGORIES.has("general"));
});
