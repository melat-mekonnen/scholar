const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isUsAggregatorArticleUrl,
  filterUsAggregatorArticleUrls,
  isExcludedUsAggregatorPath,
} = require("../src/modules/scholarship-ingestion/connectors/usAggregatorArticleUrl");

test("isExcludedUsAggregatorPath rejects feeds and static assets", () => {
  assert.equal(isExcludedUsAggregatorPath("https://scholarshipunion.com/feed/"), true);
  assert.equal(
    isExcludedUsAggregatorPath(
      "https://scholarshipunion.com/wp-content/themes/union-press/dist/assets/appJs-baeRcZv1.js",
    ),
    true,
  );
  assert.equal(isExcludedUsAggregatorPath("https://www.uscholarships.us/masters"), true);
});

test("isUsAggregatorArticleUrl accepts scholarshipunion post slugs", () => {
  assert.equal(
    isUsAggregatorArticleUrl(
      "https://scholarshipunion.com/executive-diploma-scholarships-for-women-2026-uk/",
      "scholarship_union",
    ),
    true,
  );
  assert.equal(
    isUsAggregatorArticleUrl("https://scholarshipunion.com/how-to-create-a-perfect-europass-cv/", "scholarship_union"),
    false,
  );
});

test("isUsAggregatorArticleUrl rejects uscholarships category hubs", () => {
  assert.equal(isUsAggregatorArticleUrl("https://www.uscholarships.us/masters", "us_scholarships"), false);
  assert.equal(isUsAggregatorArticleUrl("https://www.uscholarships.us/african-students/2", "us_scholarships"), false);
});

test("filterUsAggregatorArticleUrls dedupes and filters by source", () => {
  const urls = filterUsAggregatorArticleUrls(
    [
      "https://scholarshipunion.com/feed/",
      "https://scholarshipunion.com/nes-scholarship-2026-usa/",
      "https://scholarshipunion.com/nes-scholarship-2026-usa/",
    ],
    { key: "scholarship_union", hubUrl: "https://scholarshipunion.com" },
  );
  assert.deepEqual(urls, ["https://scholarshipunion.com/nes-scholarship-2026-usa/"]);
});
