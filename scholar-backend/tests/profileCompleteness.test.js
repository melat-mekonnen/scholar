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
        degreeLevel: "",
        fieldOfStudy: "",
        interests: [],
      }),
      0
    );
  });
});

describe("validateProfileInput", () => {
  test("rejects GPA above 4.0", () => {
    assert.throws(
      () =>
        validateProfileInput({
          fieldOfStudy: "x",
          gpa: 4.1,
          degreeLevel: "bachelor",
        }),
      /GPA must be between/
    );
  });

  test("rejects invalid degree level", () => {
    assert.throws(
      () =>
        validateProfileInput({
          fieldOfStudy: "x",
          gpa: 3,
          degreeLevel: "mba",
        }),
      /Degree level must be one of/
    );
  });

  test("accepts valid payload", () => {
    const v = validateProfileInput({
      fieldOfStudy: " Physics ",
      gpa: 2.5,
      degreeLevel: "master",
      preferredCountry: "DE",
      interests: ["grants"],
    });
    assert.equal(v.fieldOfStudy, " Physics ");
    assert.equal(v.gpa, 2.5);
    assert.equal(v.degreeLevel, "master");
    assert.deepEqual(v.interests, ["grants"]);
  });
});
