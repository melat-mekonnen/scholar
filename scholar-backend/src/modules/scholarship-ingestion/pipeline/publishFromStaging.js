const { ScholarshipRepository } = require("../../../repositories/ScholarshipRepository");
const { ScholarshipStagingRepository } = require("../../../repositories/ScholarshipStagingRepository");
const { validateScholarshipRecord } = require("../validateScholarship");
const { assessQualityGate } = require("../qualityGate");
const { resolveDuplicateAction } = require("../detectDuplicates");
const { mergeScholarshipRecords } = require("./mergeRecords");
const { decidePublishStatus } = require("./decidePublishStatus");
const { normalizeUrl } = require("../urlNormalize");

const scholarshipRepo = new ScholarshipRepository();
const stagingRepo = new ScholarshipStagingRepository();

async function findExistingForPublish(normalized) {
  let existing = await scholarshipRepo.findImportDuplicate({
    sourceUrl: normalized.sourceUrl,
    externalId: normalized.externalId,
    normalizedSourceUrl: normalized.normalizedSourceUrl,
  });

  if (!existing && normalized.applicationUrl) {
    existing = await scholarshipRepo.findByApplicationUrl(normalized.applicationUrl);
  }

  return existing;
}

async function publishStagedRow(stagingRow, { forcePublishStatus, ingestionSourceType, ingestionSourcePriority }) {
  const normalized = stagingRow.normalized_payload || stagingRow.normalizedPayload || {};
  const sourceName = stagingRow.source_name || normalized.sourceName;

  const validation = validateScholarshipRecord(normalized);
  const gate = assessQualityGate(normalized);
  const publishStatus = decidePublishStatus({
    record: normalized,
    gate,
    sourceName,
    forcePublishStatus,
  });

  if (!publishStatus) {
    await stagingRepo.markQuarantined({
      stagingId: stagingRow.id,
      gateReasons: gate.reasons,
      validationErrors: validation.errors,
    });
    return { outcome: "quarantined", reason: "publish_gate_failed" };
  }

  const record = {
    ...normalized,
    country: gate.country || normalized.country,
    hostCountry: gate.hostCountry,
    publishStatus,
    ingestionTier: gate.tier,
    eligibleRegions: gate.eligibleRegions,
    isRolling: gate.isRolling,
    normalizedSourceUrl: gate.normalizedSourceUrl,
    qualityScore: gate.qualityScore,
    ingestionSourceType,
    ingestionSourcePriority,
  };

  const existing = await findExistingForPublish(record);
  const dup = resolveDuplicateAction(record, existing, { mode: "merge" });

  let scholarshipId = existing?.id || null;

  if (dup.action === "update" && existing?.id) {
    const merged = mergeScholarshipRecords(existing, record);
    const updated = await scholarshipRepo.updateImportedScholarship(existing.id, merged);
    scholarshipId = updated?.id || existing.id;
  } else if (dup.action === "insert" || !existing) {
    const inserted = await scholarshipRepo.upsertImportedScholarship(record);
    scholarshipId = inserted?.id || scholarshipId;
  } else {
    const merged = mergeScholarshipRecords(existing, record);
    const updated = await scholarshipRepo.updateImportedScholarship(existing.id, merged);
    scholarshipId = updated?.id || existing.id;
  }

  await stagingRepo.markPublished({
    stagingId: stagingRow.id,
    scholarshipId,
    pipelineStatus: publishStatus === "verified" ? "published" : "ready",
  });

  return {
    outcome: publishStatus === "verified" ? "published_verified" : "published_review",
    scholarshipId,
    publishStatus,
    duplicateAction: dup.action,
  };
}

async function publishFromStaging({
  sourceName = null,
  forcePublishStatus = null,
  ingestionSourceType = null,
  ingestionSourcePriority = null,
  limit = 500,
} = {}) {
  const rows = await stagingRepo.listForPublish({ sourceName, limit });
  let published = 0;
  let quarantined = 0;
  let verified = 0;
  let needsReview = 0;

  for (const row of rows) {
    // eslint-disable-next-line no-await-in-loop
    const result = await publishStagedRow(row, {
      forcePublishStatus,
      ingestionSourceType,
      ingestionSourcePriority,
    });
    if (result.outcome === "quarantined") {
      quarantined += 1;
    } else {
      published += 1;
      if (result.publishStatus === "verified") verified += 1;
      if (result.publishStatus === "needs_review") needsReview += 1;
    }
  }

  return {
    staged: rows.length,
    published,
    verified,
    needsReview,
    quarantined,
    stagingCounts: await stagingRepo.countByStatus(),
  };
}

module.exports = {
  publishFromStaging,
  publishStagedRow,
  findExistingForPublish,
};
