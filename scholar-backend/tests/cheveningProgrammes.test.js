const test = require("node:test");
const assert = require("node:assert/strict");
const {
  cheveningCountryLeafProgrammes,
  CHEVENING_APPLY,
} = require("../src/modules/scholarship-ingestion/leafProgrammes/cheveningProgrammes");
const { buildLeafRecordsFromList } = require("../src/modules/scholarship-ingestion/leafProgrammes/buildLeafProgrammeRecord");

test("Chevening country programmes use country-specific apply URLs", () => {
  const programmes = cheveningCountryLeafProgrammes();
  assert.ok(programmes.length >= 10);

  for (const programme of programmes) {
    assert.match(
      programme.applicationUrl,
      /^https:\/\/www\.chevening\.org\/scholarship\/[a-z-]+\/?$/,
      programme.title,
    );
    assert.notEqual(
      programme.applicationUrl.replace(/\/+$/, ""),
      CHEVENING_APPLY.replace(/\/+$/, ""),
      programme.title,
    );
    assert.equal(programme.applicationUrl, programme.sourceUrl, programme.title);
  }

  const records = buildLeafRecordsFromList(programmes.slice(0, 3));
  assert.equal(records.length, 3);
  for (const record of records) {
    assert.match(record.applicationUrl, /\/scholarship\/ethiopia|kenya|nigeria/);
  }
});
