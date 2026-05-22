/**
 * Refine verified scholarships: fetch leaf page → extract facts → sectioned EN description.
 * Usage:
 *   node scripts/scholarships/enrich-descriptions.js [--all] [--fetch] [--no-fetch] [--translate] [--limit=200]
 */
require("dotenv").config();

const { pool } = require("../../src/infra/db/neonClient");
const { ScholarshipRepository } = require("../../src/repositories/ScholarshipRepository");
const {
  extractScholarshipFactsFromPage,
} = require("../../src/modules/scholarship-ingestion/ai/extractScholarshipFactsFromPage");
const {
  refineScholarshipDescription,
} = require("../../src/modules/scholarship-ingestion/ai/refineScholarshipDescription");
const { translateToAmharic } = require("../../src/modules/scholarship-ingestion/ai/translateScholarshipContent");
const { env } = require("../../src/config/env");

function mergeStoredFacts(row, fetchedFacts) {
  const stored =
    row.extracted_facts && typeof row.extracted_facts === "object" ? row.extracted_facts : null;
  if (!stored) return fetchedFacts;

  return {
    ...stored,
    ...fetchedFacts,
    title: fetchedFacts.title || stored.title,
    organization: fetchedFacts.organization || stored.organization,
    deadline: fetchedFacts.deadline || stored.deadline || row.deadline || null,
    applicationStartDate:
      fetchedFacts.applicationStartDate ||
      stored.applicationStartDate ||
      row.application_start_date ||
      null,
    applicationEndDate:
      fetchedFacts.applicationEndDate ||
      stored.applicationEndDate ||
      row.application_end_date ||
      null,
    isRolling: fetchedFacts.isRolling ?? stored.isRolling ?? Boolean(row.is_rolling),
    applicationStatus:
      fetchedFacts.applicationStatus || stored.applicationStatus || row.application_status || null,
    pageExcerpt: fetchedFacts.pageExcerpt || stored.pageExcerpt || null,
    rawExcerpt: fetchedFacts.rawExcerpt || stored.rawExcerpt || null,
  };
}

function parseArgs() {
  const translate = process.argv.includes("--translate");
  const all = process.argv.includes("--all");
  const fetchPage = !process.argv.includes("--no-fetch");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : all ? 1000 : 200;
  return { translate: translate || env.aiTranslationEnabled, all, fetchPage, limit };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const { translate, all, fetchPage, limit } = parseArgs();
  const repo = new ScholarshipRepository();
  const rows = await repo.listForContentEnrichment({
    limit,
    all,
    onlyMissingAm: translate,
    onlyUnrefined: !all,
  });

  let refined = 0;
  let translated = 0;
  let pageFetched = 0;
  let openRouterUsed = 0;
  let templateUsed = 0;

  for (const row of rows) {
    const record = {
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
    };

    // eslint-disable-next-line no-await-in-loop
    const fetchedFacts = await extractScholarshipFactsFromPage(record, { fetchPage });
    const facts = fetchPage ? fetchedFacts : mergeStoredFacts(row, fetchedFacts);
    if (facts.pageFetchStatus === "ok" || facts.pageFetchStatus === "partial") {
      pageFetched += 1;
    }

    // eslint-disable-next-line no-await-in-loop
    const refinedResult = await refineScholarshipDescription(facts);
    if (refinedResult.source === "openrouter") openRouterUsed += 1;
    else templateUsed += 1;

    const patch = {
      description: refinedResult.description,
      extractedFacts: facts,
      applicationStatus: facts.applicationStatus,
      deadline: facts.deadline || null,
      applicationStartDate: facts.applicationStartDate || null,
      applicationEndDate: facts.applicationEndDate || null,
      isRolling: facts.isRolling,
    };

    if (translate) {
      // eslint-disable-next-line no-await-in-loop
      const tr = await translateToAmharic({ title: row.title, description: refinedResult.description });
      if (tr.titleAm) patch.titleAm = tr.titleAm;
      if (tr.descriptionAm) patch.descriptionAm = tr.descriptionAm;
      if (tr.titleAm || tr.descriptionAm) translated += 1;
    }

    // eslint-disable-next-line no-await-in-loop
    await repo.updateContentFields(row.id, patch);
    refined += 1;
    // eslint-disable-next-line no-console
    console.log(
      `Refined: ${row.title.slice(0, 55)}… [${refinedResult.source}${facts.pageFetchStatus ? `, page:${facts.pageFetchStatus}` : ""}]`,
    );

    if (fetchPage) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(250);
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        refined,
        translated,
        pageFetched,
        openRouterUsed,
        templateUsed,
        fetchPage,
        aiEnabled: Boolean(env.aiDescriptionRefineEnabled && env.openRouterApiKey),
        limit,
        candidates: rows.length,
      },
      null,
      2,
    ),
  );
  await pool.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
