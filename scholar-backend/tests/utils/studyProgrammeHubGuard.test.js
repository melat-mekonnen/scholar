const test = require("node:test");
const assert = require("node:assert/strict");
const {
  isStudyProgrammeHubUrl,
  isValidStudyProgrammeListing,
  studyProgrammeNotHubSql,
} = require("../../src/utils/studyProgrammeHubGuard");

test("flags Warwick postgraduate course-list hub URL", () => {
  assert.equal(
    isStudyProgrammeHubUrl("https://warwick.ac.uk/study/postgraduate/courses/course-list/"),
    true,
  );
  assert.equal(
    isValidStudyProgrammeListing({
      title: "Course List",
      sourceUrl: "https://warwick.ac.uk/study/postgraduate/courses/course-list/",
    }),
    false,
  );
});

test("allows a real Warwick course page", () => {
  const url = "https://warwick.ac.uk/study/postgraduate/courses/data-analytics/";
  assert.equal(isStudyProgrammeHubUrl(url), false);
  assert.equal(isValidStudyProgrammeListing({ title: "MSc Data Analytics", sourceUrl: url }), true);
});

test("studyProgrammeNotHubSql excludes hub path segments", () => {
  const sql = studyProgrammeNotHubSql("p");
  assert.match(sql, /course-list/);
  assert.match(sql, /p\.source_url/);
});
