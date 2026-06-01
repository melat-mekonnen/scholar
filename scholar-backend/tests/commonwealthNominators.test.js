const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  commonwealthMastersNominatorLeafProgrammes,
  commonwealthPhdNominatorLeafProgrammes,
  COMMONWEALTH_MASTERS_NOMINATORS,
} = require("../src/modules/scholarship-ingestion/leafProgrammes/commonwealthNominators");

test("Ethiopia Commonwealth nominator apply URLs use CSC scheme page not dead MOE path", () => {
  const ethiopiaMasters = commonwealthMastersNominatorLeafProgrammes().find(
    (p) => p.externalId === "commonwealth-masters-ethiopia",
  );
  const ethiopiaPhd = commonwealthPhdNominatorLeafProgrammes().find(
    (p) => p.externalId === "commonwealth-phd-ethiopia",
  );

  assert.ok(ethiopiaMasters);
  assert.ok(ethiopiaPhd);
  assert.match(ethiopiaMasters.applicationUrl, /cscuk\.fcdo\.gov\.uk.*#nominator-ethiopia/i);
  assert.match(ethiopiaPhd.applicationUrl, /cscuk\.fcdo\.gov\.uk.*#nominator-ethiopia/i);
  assert.doesNotMatch(ethiopiaMasters.applicationUrl, /foreign-study-programs/i);
  assert.doesNotMatch(ethiopiaPhd.applicationUrl, /foreign-study-programs/i);
});

test("Commonwealth nominator descriptions reference CSC page and agency website", () => {
  const ethiopia = COMMONWEALTH_MASTERS_NOMINATORS.find((e) => e.slug === "ethiopia");
  const masters = commonwealthMastersNominatorLeafProgrammes().find(
    (p) => p.externalId === "commonwealth-masters-ethiopia",
  );

  assert.match(masters.description, /Official CSC nominator page:/i);
  assert.match(masters.description, /https:\/\/www\.moe\.gov\.et\//);
  assert.doesNotMatch(masters.description, /foreign-study-programs/i);
  assert.equal(ethiopia.agencyWebsite, "https://www.moe.gov.et/");
});
