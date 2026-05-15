const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { isProActive } = require("../src/usecases/subscription/isProActive");
const { getUsageDateString, getNextResetAtUtc } = require("../src/usecases/subscription/usageDate");

describe("isProActive", () => {
  test("free plan is not pro", () => {
    assert.equal(isProActive({ subscription_plan: "free" }), false);
  });

  test("pro without expiry is active", () => {
    assert.equal(isProActive({ subscription_plan: "pro", subscription_expires_at: null }), true);
  });

  test("pro with future expiry is active", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    assert.equal(
      isProActive({ subscription_plan: "pro", subscription_expires_at: future }),
      true
    );
  });

  test("pro with past expiry is inactive", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    assert.equal(
      isProActive({ subscription_plan: "pro", subscription_expires_at: past }),
      false
    );
  });
});

describe("usageDate helpers", () => {
  test("getUsageDateString returns YYYY-MM-DD", () => {
    const d = getUsageDateString(new Date("2026-05-15T14:30:00.000Z"));
    assert.equal(d, "2026-05-15");
  });

  test("getNextResetAtUtc is start of next UTC day", () => {
    const reset = getNextResetAtUtc(new Date("2026-05-15T14:30:00.000Z"));
    assert.equal(reset, "2026-05-16T00:00:00.000Z");
  });
});
