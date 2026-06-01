const { ScholarshipRepository } = require("../../repositories/ScholarshipRepository");
const { ScholarshipIngestionRepository } = require("../../repositories/ScholarshipIngestionRepository");
const { ScholarshipStagingRepository } = require("../../repositories/ScholarshipStagingRepository");
const { env } = require("../../config/env");
const { getSourceConfig, parseRequestedSources } = require("./sourceRegistry");
const { priorityForSourceType } = require("./sourceTypes");
const { normalizeScholarshipRecord } = require("./normalizeScholarship");
const { validateScholarshipRecord } = require("./validateScholarship");
const { assessQualityGate } = require("./qualityGate");
const { resolveDuplicateAction } = require("./detectDuplicates");
const { mergeScholarshipRecords } = require("./pipeline/mergeRecords");
const { canCaptureRecord, buildCanonicalKey } = require("./pipeline/captureRecord");
const { decidePublishStatus } = require("./pipeline/decidePublishStatus");
const { publishFromStaging } = require("./pipeline/publishFromStaging");
const { maybeTranslateScholarship } = require("../../services/scholarshipAmharicContent");

const scholarshipRepo = new ScholarshipRepository();
const ingestionRepo = new ScholarshipIngestionRepository();
const stagingRepo = new ScholarshipStagingRepository();

function assertSourceEnabled(sourceKey, config) {
  if (!config) {
    const err = new Error(`Unsupported ingestion source: ${sourceKey}`);
    err.statusCode = 400;
    throw err;
  }
  if (typeof config.enabled === "function" && !config.enabled()) {
    const err = new Error(`Ingestion source "${sourceKey}" is disabled by configuration`);
    err.statusCode = 403;
    throw err;
  }
}

function dedupMode() {
  return env.ingestDedupMode === "strict" ? "strict" : "merge";
}

async function findExistingImport(normalized, { fuzzy = false } = {}) {
  let existing = await scholarshipRepo.findImportDuplicate({
    sourceUrl: normalized.sourceUrl,
    externalId: normalized.externalId,
    normalizedSourceUrl: normalized.normalizedSourceUrl,
    sourceName: normalized.sourceName,
  });

  if (fuzzy && !existing && normalized.country) {
    const { titleSimilarity } = require("./urlNormalize");
    const candidates = await scholarshipRepo.listImportCandidatesByCountry(normalized.country, 80);
    for (const candidate of candidates) {
      if (titleSimilarity(normalized.title, candidate.title) >= 0.85) {
        return candidate;
      }
    }
  }

  return existing;
}

async function captureSourceRecords({ sourceKey, config, run }) {
  let fetched = 0;
  let captured = 0;
  let quarantined = 0;

  const records = await config.fetch();
  fetched = records.length;
  const sourceName = config.sourceName || sourceKey.toUpperCase();

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

    const capture = canCaptureRecord(normalized);
    const validation = validateScholarshipRecord(normalized);
    const gate = assessQualityGate(normalized);
    const canonicalKey = buildCanonicalKey(normalized, sourceName);

    const pipelineStatus = capture.ok ? "captured" : "quarantined";
    if (pipelineStatus === "captured") captured += 1;
    else quarantined += 1;

    await stagingRepo.upsertCaptured({
      runId: run.id,
      canonicalKey,
      sourceName,
      sourceUrl: normalized.sourceUrl,
      externalId: normalized.externalId,
      pipelineStatus,
      validationErrors: validation.errors,
      gateReasons: gate.reasons,
      qualityScore: gate.qualityScore,
      normalizedPayload: normalized,
      rawPayload: raw,
    });

    if (!capture.ok) {
      await ingestionRepo.addError({
        runId: run.id,
        sourceName,
        sourceUrl: normalized.sourceUrl,
        externalId: normalized.externalId,
        errorType: "capture_quarantined",
        errorMessage: capture.errors.join("; "),
        payload: normalized,
      });
    }
  }

  return { fetched, captured, quarantined };
}

async function publishDirectRecord({
  run,
  sourceName,
  record,
  gate,
  forcePublishStatus,
  ingestionSourceType,
  ingestionSourcePriority,
}) {
  const publishStatus = decidePublishStatus({
    record,
    gate,
    sourceName,
    forcePublishStatus,
  });

  if (!publishStatus) {
    await ingestionRepo.addError({
      runId: run.id,
      sourceName,
      sourceUrl: record.sourceUrl,
      externalId: record.externalId,
      errorType: "publish_quarantined",
      errorMessage: (gate.reasons || []).join("; ") || "failed publish gate",
      payload: { ...record, qualityGate: gate },
    });
    return { outcome: "quarantined" };
  }

  const enriched = {
    ...record,
    publishStatus,
    ingestionSourceType,
    ingestionSourcePriority,
  };

  const existing = await findExistingImport(enriched, { fuzzy: dedupMode() === "strict" });
  const dup = resolveDuplicateAction(enriched, existing, { mode: dedupMode() });

  let scholarshipId = existing?.id || null;

  if (dup.action === "update" && existing?.id) {
    const merged = mergeScholarshipRecords(existing, enriched);
    const updated = await scholarshipRepo.updateImportedScholarship(existing.id, merged);
    scholarshipId = updated?.id || existing.id;
  } else {
    const inserted = await scholarshipRepo.upsertImportedScholarship(enriched);
    scholarshipId = inserted?.id || scholarshipId;
  }

  if (scholarshipId) {
    maybeTranslateScholarship(scholarshipId);
  }

  return { outcome: "published", duplicateAction: dup.action, scholarshipId };
}

async function processSourceRecords({ sourceKey, config, forcePublishStatus }) {
  const sourceName = config.sourceName || sourceKey.toUpperCase();
  const ingestionSourceType = config.sourceType || null;
  const ingestionSourcePriority = ingestionSourceType
    ? priorityForSourceType(ingestionSourceType)
    : null;
  const run = await ingestionRepo.createRun({ sourceName });
  let fetched = 0;
  let upserted = 0;
  let failed = 0;
  let skipped = 0;
  let quarantined = 0;

  try {
    if (env.ingestPipelineMode === "staging") {
      const capture = await captureSourceRecords({ sourceKey, config, run });
      fetched = capture.fetched;
      quarantined = capture.quarantined;

      const publish = await publishFromStaging({
        sourceName,
        forcePublishStatus,
        ingestionSourceType,
        ingestionSourcePriority,
      });

      upserted = publish.published;
      quarantined += publish.quarantined;
      failed = capture.quarantined;

      await ingestionRepo.completeRun({
        runId: run.id,
        fetched,
        upserted,
        failed,
        skipped,
      });

      return {
        runId: run.id,
        source: sourceKey,
        sourceName,
        pipeline: "staging",
        fetched,
        captured: capture.captured,
        upserted,
        verified: publish.verified,
        needsReview: publish.needsReview,
        failed,
        quarantined,
        skipped,
        stagingCounts: publish.stagingCounts,
      };
    }

    const records = await config.fetch();
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

      const gate = assessQualityGate(normalized);
      const record = {
        ...normalized,
        country: gate.country || normalized.country,
        hostCountry: gate.hostCountry,
        ingestionTier: gate.tier,
        eligibleRegions: gate.eligibleRegions,
        isRolling: gate.isRolling,
        normalizedSourceUrl: gate.normalizedSourceUrl,
        qualityScore: gate.qualityScore,
        ingestionSourceType,
        ingestionSourcePriority,
      };

      const result = await publishDirectRecord({
        run,
        sourceName,
        record,
        gate,
        forcePublishStatus,
        ingestionSourceType,
        ingestionSourcePriority,
      });

      if (result.outcome === "quarantined") {
        quarantined += 1;
        continue;
      }
      upserted += 1;
    }

    await ingestionRepo.completeRun({
      runId: run.id,
      fetched,
      upserted,
      failed,
      skipped,
    });

    return {
      runId: run.id,
      source: sourceKey,
      sourceName,
      pipeline: "direct",
      fetched,
      upserted,
      failed,
      quarantined,
      skipped,
    };
  } catch (err) {
    await ingestionRepo.failRun({
      runId: run.id,
      fetched,
      upserted,
      failed,
      skipped,
      errorMessage: err.message,
    });
    throw err;
  }
}

async function runScholarshipIngestion({
  source = "africa",
  forcePublishStatus = null,
}) {
  if (!env.ingestionEnabled) {
    const err = new Error("Scholarship ingestion is disabled by configuration");
    err.statusCode = 403;
    throw err;
  }

  const sourceKeys = parseRequestedSources(source);
  const results = [];

  for (const sourceKey of sourceKeys) {
    const config = getSourceConfig(sourceKey);
    assertSourceEnabled(sourceKey, config);
    // eslint-disable-next-line no-await-in-loop
    const result = await processSourceRecords({ sourceKey, config, forcePublishStatus });
    results.push(result);
  }

  if (results.length === 1) {
    return results[0];
  }

  return {
    source: sourceKeys.join(","),
    sourceName: "MULTI",
    pipeline: env.ingestPipelineMode,
    runs: results,
    fetched: results.reduce((n, r) => n + r.fetched, 0),
    upserted: results.reduce((n, r) => n + r.upserted, 0),
    failed: results.reduce((n, r) => n + r.failed, 0),
    quarantined: results.reduce((n, r) => n + (r.quarantined || 0), 0),
    skipped: results.reduce((n, r) => n + (r.skipped || 0), 0),
  };
}

module.exports = { runScholarshipIngestion };
