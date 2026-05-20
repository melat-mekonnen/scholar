/**
 * Refine verified scholarships: extract facts → sectioned EN description → optional Amharic.
 * Usage: node scripts/refine-scholarship-descriptions.js [--translate] [--limit=50]
 */
require("dotenv").config();

const { pool } = require("../src/infra/db/neonClient");
const { ScholarshipRepository } = require("../src/repositories/ScholarshipRepository");
const { extractScholarshipFacts } = require("../src/modules/scholarship-ingestion/ai/extractScholarshipFacts");
const { refineScholarshipDescription } = require("../src/modules/scholarship-ingestion/ai/refineScholarshipDescription");
const { translateToAmharic } = require("../src/modules/scholarship-ingestion/ai/translateScholarshipContent");
const { env } = require("../src/config/env");

function parseArgs() {
  const translate = process.argv.includes("--translate");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 50;
  return { translate: translate || env.aiTranslationEnabled, limit };
}

async function main() {
  const { translate, limit } = parseArgs();
  const repo = new ScholarshipRepository();
  const rows = await repo.listForContentEnrichment({ limit, onlyMissingAm: translate });

  let refined = 0;
  let translated = 0;

  for (const row of rows) {
    const facts = extractScholarshipFacts({
      title: row.title,
      organizationName: row.organization_name,
      country: row.country,
      hostCountry: row.host_country,
      degreeLevel: row.degree_level,
      fieldOfStudy: row.field_of_study,
      fundingType: row.funding_type,
      amount: row.amount,
      deadline: row.deadline,
      applicationStartDate: row.application_start_date,
      applicationEndDate: row.application_end_date,
      applicationUrl: row.application_url,
      sourceUrl: row.source_url,
      description: row.description,
      isRolling: row.is_rolling,
      eligibleRegions: row.eligible_regions,
    });

    const { description } = await refineScholarshipDescription(facts);
    const patch = {
      description,
      extractedFacts: facts,
      applicationStatus: facts.applicationStatus,
    };

    if (translate) {
      const tr = await translateToAmharic({ title: row.title, description });
      if (tr.titleAm) patch.titleAm = tr.titleAm;
      if (tr.descriptionAm) patch.descriptionAm = tr.descriptionAm;
      if (tr.titleAm || tr.descriptionAm) translated += 1;
    }

    await repo.updateContentFields(row.id, patch);
    refined += 1;
    // eslint-disable-next-line no-console
    console.log(`Refined: ${row.title.slice(0, 60)}…`);
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ refined, translated, limit }, null, 2));
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
