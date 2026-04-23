const { AdminScholarshipRepository } = require("../../repositories/AdminScholarshipRepository");
const { ScholarshipIngestionRepository } = require("../../repositories/ScholarshipIngestionRepository");
const { runScholarshipIngestion } = require("../../modules/scholarship-ingestion/runScholarshipIngestion");

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
    publishStatus: publishStatus || "verified",
  });
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
};

