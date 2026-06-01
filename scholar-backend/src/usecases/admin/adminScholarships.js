const { AdminScholarshipRepository } = require("../../repositories/AdminScholarshipRepository");
const { ScholarshipIngestionRepository } = require("../../repositories/ScholarshipIngestionRepository");
const { runScholarshipIngestion } = require("../../modules/scholarship-ingestion/runScholarshipIngestion");
const { listSourceMetadata } = require("../../modules/scholarship-ingestion/sourceRegistry");
const { maybeTranslateScholarship } = require("../../services/scholarshipAmharicContent");

const repo = new AdminScholarshipRepository();
const ingestionRepo = new ScholarshipIngestionRepository();

async function listScholarships({ search, status }) {
  const scholarships = await repo.list({ search, status });
  return scholarships;
}

async function listPendingScholarships({ search }) {
  const scholarships = await repo.listPending({ search });
  return scholarships;
}

async function getScholarshipById(id) {
  const scholarship = await repo.findById(id);
  if (!scholarship) {
    const err = new Error("Scholarship not found");
    err.statusCode = 404;
    throw err;
  }
  return scholarship;
}

async function verifyScholarship(id) {
  const updated = await repo.updateStatus(id, "verified", null);
  if (!updated) {
    const err = new Error("Scholarship not found");
    err.statusCode = 404;
    throw err;
  }
  await maybeTranslateScholarship(id, { awaitResult: true });
  return updated;
}

async function rejectScholarship(id, reason) {
  const updated = await repo.updateStatus(id, "rejected", reason || null);
  if (!updated) {
    const err = new Error("Scholarship not found");
    err.statusCode = 404;
    throw err;
  }
  return updated;
}

async function listImportRuns({ limit }) {
  return ingestionRepo.listRuns({ limit: limit ? Number(limit) : 50 });
}

async function listImportErrors({ limit }) {
  return ingestionRepo.listErrors({ limit: limit ? Number(limit) : 100 });
}

async function runImport({ source, publishStatus }) {
  return runScholarshipIngestion({
    source: source || "daad",
    forcePublishStatus: publishStatus || null,
  });
}

async function listImportSourceHealth() {
  const health = await ingestionRepo.listSourceHealth();
  const registry = listSourceMetadata();

  return registry.map((meta) => {
    const row = health.find((h) => h.sourceName === meta.sourceName);
    return {
      id: meta.id,
      sourceName: meta.sourceName,
      sourceType: meta.sourceType,
      priority: meta.priority,
      enabled: meta.enabled,
      ...(row || {
        lastCrawlAt: null,
        lastStatus: null,
        lastNewScholarships: 0,
        duplicateRate: 0,
        failureRate: 0,
        healthStatus: "never_run",
      }),
    };
  });
}

function listImportSources() {
  return listSourceMetadata().map((meta) => ({
    id: meta.id,
    label: meta.sourceName,
    sourceType: meta.sourceType,
    priority: meta.priority,
    enabled: meta.enabled,
  }));
}

module.exports = {
  listScholarships,
  listPendingScholarships,
  getScholarshipById,
  verifyScholarship,
  rejectScholarship,
  listImportRuns,
  listImportErrors,
  runImport,
  listImportSources,
  listImportSourceHealth,
};

