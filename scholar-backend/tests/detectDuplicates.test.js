const test = require("node:test");
const assert = require("node:assert/strict");
const { resolveDuplicateAction } = require("../src/modules/scholarship-ingestion/detectDuplicates");

test("resolveDuplicateAction skips same application URL from lower tier", () => {
  const action = resolveDuplicateAction(
    {
      title: "Chevening Scholarships",
      applicationUrl: "https://www.chevening.org/apply/",
      ingestionTier: "aggregator",
    },
    {
      title: "Chevening Scholarships",
      application_url: "https://www.chevening.org/apply/",
      ingestion_tier: "government_trusted",
      description: "Long official description ".repeat(20),
    },
  );
  assert.equal(action.action, "skip");
});

test("resolveDuplicateAction updates when incoming has higher tier", () => {
  const action = resolveDuplicateAction(
    {
      title: "Chevening Scholarships for Leaders",
      applicationUrl: "https://www.chevening.org/apply/",
      ingestionTier: "government_trusted",
      description: "x".repeat(400),
    },
    {
      title: "Chevening Scholarships",
      application_url: "https://www.chevening.org/apply/?utm_source=test",
      ingestion_tier: "aggregator",
      description: "short",
    },
  );
  assert.equal(action.action, "update");
});

test("resolveDuplicateAction inserts distinct programmes", () => {
  const action = resolveDuplicateAction(
    { title: "DAAD EPOS Postgraduate Courses", country: "Germany", degreeLevel: "master" },
    { title: "DAAD Research Grants PhD", country: "Germany", degree_level: "phd" },
  );
  assert.equal(action.action, "insert");
});
