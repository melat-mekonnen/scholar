const test = require("node:test");
const assert = require("node:assert/strict");
const { mergeScholarshipRecords, pickPublishStatus } = require("../src/modules/scholarship-ingestion/pipeline/mergeRecords");
const { decidePublishStatus } = require("../src/modules/scholarship-ingestion/pipeline/decidePublishStatus");
const { canCaptureRecord, buildCanonicalKey } = require("../src/modules/scholarship-ingestion/pipeline/captureRecord");
const { resolveDuplicateAction } = require("../src/modules/scholarship-ingestion/detectDuplicates");
const { CURATED_LEAF_SOURCE } = require("../src/modules/scholarship-ingestion/sourceNames");

test("canCaptureRecord accepts minimal fetch row", () => {
  const result = canCaptureRecord({
    title: "DAAD EPOS Programme",
    sourceUrl: "https://www.daad.de/example",
    applicationUrl: "https://www.daad.de/apply",
  });
  assert.equal(result.ok, true);
});

test("buildCanonicalKey normalizes source url", () => {
  const key = buildCanonicalKey(
    { sourceUrl: "https://Example.com/path/", applicationUrl: "https://example.com/apply" },
    "DAAD",
  );
  assert.ok(key.includes("example.com"));
});

test("mergeScholarshipRecords keeps longer description", () => {
  const merged = mergeScholarshipRecords(
    { title: "Chevening", description: "short", status: "verified" },
    { title: "Chevening Scholarships", description: "x".repeat(500), publishStatus: "needs_review" },
  );
  assert.equal(merged.description.length, 500);
  assert.equal(merged.publishStatus, "verified");
});

test("decidePublishStatus quarantines hub titles for scrapers", () => {
  const status = decidePublishStatus({
    record: {
      title: "Home - FEDERAL MINISTRY OF EDUCATION",
      description: "x".repeat(300),
      applicationUrl: "https://education.gov.ng/",
      country: "Nigeria",
      sourceUrl: "https://education.gov.ng/",
    },
    gate: { pass: true, publishStatus: "verified", reasons: [] },
    sourceName: "AFRICAN_MINISTRIES",
  });
  assert.equal(status, null);
});

test("decidePublishStatus allows curated leaf sources through", () => {
  const status = decidePublishStatus({
    record: {
      title: "Commonwealth Master's Scholarships",
      description: "x".repeat(400),
      applicationUrl: "https://cscuk.fcdo.gov.uk/apply",
      country: "United Kingdom",
      sourceUrl: "https://cscuk.fcdo.gov.uk/scholarships/",
    },
    gate: { pass: true, publishStatus: "verified", reasons: [] },
    sourceName: CURATED_LEAF_SOURCE,
  });
  assert.equal(status, "verified");
});

test("decidePublishStatus sends thin scraper rows to needs_review", () => {
  const status = decidePublishStatus({
    record: {
      title: "Colombia Scholarship Programme 2026",
      description: "x".repeat(150),
      applicationUrl: "https://education.go.ke/apply",
      country: "Kenya",
      sourceUrl: "https://education.go.ke/scholarships/colombia",
    },
    gate: { pass: false, publishStatus: "pending", reasons: ["aggregator requires manual or explicit auto-verify"] },
    sourceName: "AFRICAN_MINISTRIES",
  });
  assert.equal(status, "needs_review");
});

test("resolveDuplicateAction merge mode updates instead of skip", () => {
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
    { mode: "merge" },
  );
  assert.equal(action.action, "update");
});

test("pickPublishStatus prefers verified over needs_review", () => {
  assert.equal(pickPublishStatus({ status: "needs_review" }, { publishStatus: "verified" }), "verified");
});
