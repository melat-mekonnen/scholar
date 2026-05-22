const test = require("node:test");
const assert = require("node:assert/strict");
const {
  matchDuplicateReason,
  pickWinner,
  buildDuplicateClusters,
  planDeduplication,
} = require("../src/modules/scholarship-ingestion/deduplicateScholarships");

test("matchDuplicateReason keeps different programmes on shared hub URLs separate", () => {
  const hub = "https://education.gov.ng/federal-scholarships-board/";
  const reason = matchDuplicateReason(
    {
      title: "Commonwealth Master's Scholarship — Nigeria (via national nominator)",
      application_url: hub,
      external_id: "commonwealth-masters-nigeria",
      source_name: "CURATED_LEAF",
      country: "Nigeria",
    },
    {
      title: "Commonwealth PhD Scholarship — Nigeria (via national nominator)",
      application_url: hub,
      external_id: "commonwealth-phd-nigeria",
      source_name: "CURATED_LEAF",
      country: "Nigeria",
    },
  );
  assert.equal(reason, null);
});

test("matchDuplicateReason keeps different sources with same apply URL separate", () => {
  const apply = "https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/?detail=50076777";
  const reason = matchDuplicateReason(
    {
      title: "Fully Funded DAAD EPOS Scholarship",
      application_url: apply,
      external_id: "mastersportal-daad-epos",
      source_name: "MASTERSPORTAL",
    },
    {
      title: "DAAD EPOS Postgraduate Courses",
      application_url: apply,
      external_id: "daad-epos",
      source_name: "DAAD",
    },
  );
  assert.equal(reason, null);
});

test("matchDuplicateReason clusters same-source re-import copies", () => {
  const reason = matchDuplicateReason(
    {
      title: "Commonwealth Master's Scholarship — South Africa (via national nominator)",
      external_id: "commonwealth-masters-south-africa",
      source_name: "CURATED_LEAF",
      source_url: "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-masters-scholarships#nominator-south-africa",
    },
    {
      title: "Commonwealth Master's Scholarship — South Africa (via national nominator)",
      external_id: "commonwealth-masters-south-africa",
      source_name: "CURATED_LEAF",
      source_url: "https://cscuk.fcdo.gov.uk/scholarships/commonwealth-masters-scholarships/#nominator-south-africa/",
    },
  );
  assert.equal(reason, "same_source_and_external_id");
});

test("pickWinner prefers verified gov source over aggregator copy", () => {
  const winner = pickWinner([
    {
      id: "agg",
      title: "Erasmus Mundus Joint Masters scholarships",
      status: "verified",
      source_name: "MASTERSPORTAL",
      ingestion_tier: "aggregator",
      quality_score: 60,
      description: "short",
    },
    {
      id: "gov",
      title: "Erasmus Mundus Joint Masters",
      status: "verified",
      source_name: "ERASMUS",
      ingestion_tier: "government_trusted",
      quality_score: 90,
      description: "x".repeat(400),
      external_id: "erasmus-mundus",
    },
  ]);
  assert.equal(winner.id, "gov");
});

test("planDeduplication marks only same-source re-import copies", () => {
  const plan = planDeduplication([
    {
      id: "a",
      title: "Queen Elizabeth Commonwealth Scholarships",
      application_url: "https://www.acu.ac.uk/funding-opportunities/for-students/scholarships/queen-elizabeth-commonwealth-scholarships/",
      external_id: "mastersportal-qecs",
      source_name: "MASTERSPORTAL",
      status: "needs_review",
      record_type: "scholarship",
    },
    {
      id: "b",
      title: "Queen Elizabeth Commonwealth Scholarships",
      application_url: "https://www.acu.ac.uk/funding-opportunities/for-students/scholarships/queen-elizabeth-commonwealth-scholarships/",
      external_id: "commonwealth-qecs",
      source_name: "COMMONWEALTH",
      status: "verified",
      record_type: "scholarship",
    },
    {
      id: "c",
      title: "Queen Elizabeth Commonwealth Scholarships",
      application_url: "https://www.acu.ac.uk/funding-opportunities/for-students/scholarships/queen-elizabeth-commonwealth-scholarships/?utm=1",
      external_id: "mastersportal-qecs",
      source_name: "MASTERSPORTAL",
      status: "needs_review",
      record_type: "scholarship",
    },
  ]);

  assert.equal(plan.summary.clusterCount, 1);
  assert.equal(plan.actions.length, 1);
  assert.equal(plan.actions[0].loserId, "c");
  assert.equal(plan.actions[0].winnerId, "a");
});

test("buildDuplicateClusters links transitive same-source duplicates", () => {
  const clusters = buildDuplicateClusters([
    {
      id: "1",
      title: "Fulbright Foreign Student Program",
      external_id: "fulbright-foreign",
      source_name: "CURATED_LEAF",
    },
    {
      id: "2",
      title: "Fulbright Foreign Student Program 2027",
      external_id: "fulbright-foreign",
      source_name: "CURATED_LEAF",
    },
  ]);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].length, 2);
});
