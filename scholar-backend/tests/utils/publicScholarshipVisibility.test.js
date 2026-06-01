const test = require("node:test");
const assert = require("node:assert/strict");
const { publicOpenScholarshipSql } = require("../../src/utils/publicScholarshipVisibility");

test("publicOpenScholarshipSql prefixes columns when alias is set", () => {
  const sql = publicOpenScholarshipSql("s");
  assert.match(sql, /s\.deadline/);
  assert.match(sql, /s\.application_status/);
  assert.match(sql, /s\.application_end_date/);
  assert.match(sql, /<> 'closed'/);
});

test("publicOpenScholarshipSql omits prefix for empty alias", () => {
  const sql = publicOpenScholarshipSql("");
  assert.match(sql, /\(deadline IS NULL/);
  assert.doesNotMatch(sql, /s\.deadline/);
});
