const { test } = require("node:test");
const assert = require("node:assert/strict");
const { validatePassword, getPasswordStrength } = require("../src/utils/passwordPolicy");

test("validatePassword rejects password without number or symbol", () => {
  assert.throws(() => validatePassword("password"), /number/);
  assert.throws(() => validatePassword("Password1"), /symbol/);
});

test("validatePassword accepts password meeting all rules", () => {
  assert.doesNotThrow(() => validatePassword("SecureP@ss1"));
});

test("getPasswordStrength returns expected labels", () => {
  assert.equal(getPasswordStrength(""), "weak");
  assert.equal(getPasswordStrength("abc"), "weak");
  assert.equal(getPasswordStrength("Passw0rd!"), "fair");
  assert.equal(getPasswordStrength("VerySecureP@ssw0rd"), "strong");
});
