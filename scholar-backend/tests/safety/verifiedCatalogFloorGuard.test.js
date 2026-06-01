const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseFloor,
  resolveVerifiedFloor,
  assertVerifiedFloor,
} = require("../../src/modules/scholarship-ingestion/verifiedFloorGuard");

test("parseFloor handles empty and invalid values", () => {
  assert.equal(parseFloor(null), null);
  assert.equal(parseFloor(""), null);
  assert.equal(parseFloor("abc"), null);
  assert.equal(parseFloor("-1"), null);
  assert.equal(parseFloor("120"), 120);
});

test("resolveVerifiedFloor prefers highest between env and baseline table", async () => {
  const calls = [];
  const queryFn = async (sql) => {
    calls.push(sql);
    if (sql.includes("to_regclass")) {
      return { rows: [{ regclass: "scholarship_catalog_baselines" }] };
    }
    return { rows: [{ floor: 410 }] };
  };

  const floor = await resolveVerifiedFloor({
    explicitFloor: "300",
    queryFn,
  });
  assert.equal(floor, 410);
  assert.ok(calls.length >= 2);
});

test("resolveVerifiedFloor falls back to explicit floor when baseline table absent", async () => {
  const queryFn = async () => ({ rows: [{ regclass: null }] });
  const floor = await resolveVerifiedFloor({
    explicitFloor: "275",
    queryFn,
  });
  assert.equal(floor, 275);
});

test("assertVerifiedFloor throws when count drops below floor", () => {
  assert.throws(
    () => assertVerifiedFloor({ count: 299, floor: 300, operation: "test run" }),
    /floor violation/i,
  );
  assert.doesNotThrow(() => assertVerifiedFloor({ count: 300, floor: 300 }));
});
