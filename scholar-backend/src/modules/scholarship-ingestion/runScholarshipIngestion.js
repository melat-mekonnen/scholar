const { ScholarshipRepository } = require("../../repositories/ScholarshipRepository");
const { ScholarshipIngestionRepository } = require("../../repositories/ScholarshipIngestionRepository");
const { env } = require("../../config/env");
const { fetchDaadScholarships } = require("./connectors/daadConnector");
const { normalizeScholarshipRecord } = require("./normalizeScholarship");
const { validateScholarshipRecord } = require("./validateScholarship");

const scholarshipRepo = new ScholarshipRepository();
const ingestionRepo = new ScholarshipIngestionRepository();

async function runScholarshipIngestion({
  source = "daad",
  publishStatus = "verified",
}) {
  if (!env.ingestionEnabled) {
    const err = new Error("Scholarship ingestion is disabled by configuration");
    err.statusCode = 403;
    throw err;
  }

  if (source === "daad" && !env.ingestDaadEnabled) {
    const err = new Error("DAAD ingestion source is disabled by configuration");
    err.statusCode = 403;
    throw err;
  }

  const sourceName = source.toUpperCase();
  const run = await ingestionRepo.createRun({ sourceName });
  let fetched = 0;
  let upserted = 0;
  let failed = 0;

  try {
    if (source !== "daad") {
      const err = new Error(`Unsupported ingestion source: ${source}`);
      err.statusCode = 400;
      throw err;
    }

    const records = await fetchDaadScholarships();
    fetched = records.length;

    for (const raw of records) {
      const normalized = normalizeScholarshipRecord({ ...raw, sourceName });
      await ingestionRepo.addRawRecord({
        runId: run.id,
        sourceName,
        sourceUrl: normalized.sourceUrl,
        externalId: normalized.externalId,
        payload: raw,
        normalizedPayload: normalized,
      });

      const validation = validateScholarshipRecord(normalized);
      if (!validation.valid) {
        failed += 1;
        await ingestionRepo.addError({
          runId: run.id,
          sourceName,
          sourceUrl: normalized.sourceUrl,
          externalId: normalized.externalId,
          errorType: "validation_error",
          errorMessage: validation.errors.join("; "),
          payload: normalized,
        });
        continue;
      }

      try {
        await scholarshipRepo.upsertImportedScholarship({
          ...normalized,
          publishStatus,
        });
        upserted += 1;
      } catch (err) {
        failed += 1;
        await ingestionRepo.addError({
          runId: run.id,
          sourceName,
          sourceUrl: normalized.sourceUrl,
          externalId: normalized.externalId,
          errorType: "db_upsert_error",
          errorMessage: err.message,
          payload: normalized,
        });
      }
    }

    await ingestionRepo.completeRun({
      runId: run.id,
      fetched,
      upserted,
      failed,
    });
  } catch (err) {
    await ingestionRepo.failRun({
      runId: run.id,
      fetched,
      upserted,
      failed,
      errorMessage: err.message,
    });
    throw err;
  }

  return {
    runId: run.id,
    sourceName,
    fetched,
    upserted,
    failed,
    publishStatus,
  };
}

module.exports = { runScholarshipIngestion };
