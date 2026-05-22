/**
 * Seed Warwick study programmes into study_programmes table (Phase 4).
 */
require("dotenv").config();

const { pool } = require("../src/infra/db/neonClient");
const { StudyProgrammeRepository } = require("../src/repositories/StudyProgrammeRepository");
const { warwickStudyProgrammeRecords } = require("../src/modules/scholarship-ingestion/leafProgrammes/warwickStudyProgrammes");
const { extractScholarshipFacts } = require("../src/modules/scholarship-ingestion/ai/extractScholarshipFacts");
const { formatDescriptionFromFacts } = require("../src/modules/scholarship-ingestion/ai/formatDescriptionSections");

async function main() {
  const repo = new StudyProgrammeRepository();
  let upserted = 0;

  for (const record of warwickStudyProgrammeRecords()) {
    const facts = extractScholarshipFacts(record);
    await repo.upsertProgramme({
      title: record.title,
      organizationName: record.organizationName,
      country: record.country,
      hostCountry: record.hostCountry,
      degreeLevel: record.degreeLevel,
      fieldOfStudy: record.fieldOfStudy,
      fundingType: "not_funded",
      programmeStartDate: record.programmeStartDate,
      description: formatDescriptionFromFacts(facts),
      extractedFacts: facts,
      applicationUrl: record.applicationUrl,
      sourceUrl: record.sourceUrl,
      externalId: record.externalId,
      status: "verified",
      isRolling: true,
      qualityScore: 70,
    });
    upserted += 1;
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ upserted }, null, 2));
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
