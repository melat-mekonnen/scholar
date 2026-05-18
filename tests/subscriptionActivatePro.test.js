const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { isProActive } = require("../src/usecases/subscription/isProActive");

describe("subscription payment → pro state", () => {
  test("activatePro target row shape is pro-active", () => {
    const row = {
      subscription_plan: "pro",
      subscription_expires_at: null,
      subscription_provider: "stripe",
      subscription_external_id: "sub_test_123",
    };
    assert.equal(isProActive(row), true);
    assert.equal(row.subscription_provider, "stripe");
  });
});
