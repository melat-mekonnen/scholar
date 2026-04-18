const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateProfileCompleteness,
  validateProfileInput,
} = require("../src/usecases/profile/profileCompleteness");

describe("calculateProfileCompleteness", () => {
  test("returns 100 when all sections present", () => {
    const score = calculateProfileCompleteness({
      gpa: 3.5,
      degreeLevel: "bachelor",
      fieldOfStudy: "Computer Science",
      interests: ["ai"],
    });
    assert.equal(score, 100);
  });

  test("returns 0 for empty profile", () => {
    assert.equal(
      calculateProfileCompleteness({
        gpa: null,
        degreeLevel: null,
        fieldOfStudy: null,
        interests: [],
      }),
      0
    );
  });
});

describe("validateProfileInput", () => {
  test("allows empty / all-null profile", () => {
    const v = validateProfileInput({});
    assert.equal(v.fieldOfStudy, null);
    assert.equal(v.gpa, null);
    assert.equal(v.degreeLevel, null);
    assert.equal(v.preferredCountry, null);
    assert.deepEqual(v.interests, []);
  });

  test("rejects GPA above 4.0 when provided", () => {
    assert.throws(() => validateProfileInput({ gpa: 4.1 }), /between 0.0 and 4.0/);
  });

  test("rejects invalid degree level when provided", () => {
    assert.throws(
      () => validateProfileInput({ degreeLevel: "mba" }),
      /Degree level must be one of/
    );
  });

  test("accepts valid partial payload", () => {
    const v = validateProfileInput({
      fieldOfStudy: " Physics ",
      gpa: 2.5,
      degreeLevel: "master",
      preferredCountry: "DE",
      interests: ["grants"],
    });
    assert.equal(v.fieldOfStudy, "Physics");
    assert.equal(v.gpa, 2.5);
    assert.equal(v.degreeLevel, "master");
    assert.equal(v.preferredCountry, "DE");
    assert.deepEqual(v.interests, ["grants"]);
  });
});
