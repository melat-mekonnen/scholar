const test = require("node:test");
const assert = require("node:assert/strict");

const {
  initialStatusForCreator,
  nextStatusAfterUpdate,
  assertCanMutateScholarship,
  parseDeadline,
} = require("../src/usecases/scholarships/scholarshipCrudRules");

test("initialStatusForCreator maps roles to expected workflow", () => {
  assert.equal(initialStatusForCreator("manager"), "pending");
  assert.equal(initialStatusForCreator("owner"), "verified");
  assert.equal(initialStatusForCreator("admin"), "verified");
});

test("nextStatusAfterUpdate keeps owner/admin direct publish", () => {
  assert.equal(nextStatusAfterUpdate("manager"), "pending");
  assert.equal(nextStatusAfterUpdate("owner"), "verified");
  assert.equal(nextStatusAfterUpdate("admin"), "verified");
});

test("assertCanMutateScholarship allows owner/admin and manager-own", () => {
  const scholarship = { posted_by_user_id: "u1" };
  assert.doesNotThrow(() =>
    assertCanMutateScholarship({ id: "u2", role: "owner" }, scholarship),
  );
  assert.doesNotThrow(() =>
    assertCanMutateScholarship({ id: "u3", role: "admin" }, scholarship),
  );
  assert.doesNotThrow(() =>
    assertCanMutateScholarship({ id: "u1", role: "manager" }, scholarship),
  );
});

test("assertCanMutateScholarship blocks manager editing others", () => {
  const scholarship = { posted_by_user_id: "u1" };
  assert.throws(
    () => assertCanMutateScholarship({ id: "u9", role: "manager" }, scholarship),
    /Forbidden/,
  );
});

test("parseDeadline rejects past dates and accepts future", () => {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  assert.equal(parseDeadline(tomorrow, { required: true }), tomorrow);
  assert.throws(() => parseDeadline(yesterday, { required: true }), /Deadline must be today or in the future/);
});
