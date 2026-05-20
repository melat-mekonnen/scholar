const { buildRecordFromOfficialPage } = require("./officialPageRecord");

async function buildProgrammeRecord(options) {
  return buildRecordFromOfficialPage(options);
}

async function buildRecordsFromLinks(links, defaults) {
  const records = [];
  for (const url of links) {
    const slug = url.replace(/\/+$/, "").split("/").pop() || "programme";
    // eslint-disable-next-line no-await-in-loop
    const record = await buildRecordFromOfficialPage({
      url,
      externalId: `${defaults.externalIdPrefix}-${slug}`.slice(0, 120),
      organizationName: defaults.organizationName,
      country: defaults.country,
      degreeLevel: defaults.degreeLevel,
      fieldOfStudy: defaults.fieldOfStudy,
      fundingType: defaults.fundingType,
      amount: defaults.amount,
      titleHint: defaults.fallbackTitle,
      applicationUrl: defaults.applicationUrl || url,
    });
    if (record) records.push(record);
  }
  return records;
}

module.exports = { buildProgrammeRecord, buildRecordsFromLinks };
