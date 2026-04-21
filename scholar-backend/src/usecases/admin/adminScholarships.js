const { AdminScholarshipRepository } = require("../../repositories/AdminScholarshipRepository");
const { ScholarshipModerationRepository } = require("../../repositories/ScholarshipModerationRepository");

const repo = new AdminScholarshipRepository();
const moderationRepo = new ScholarshipModerationRepository();

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

async function flagScholarship(id, actorUserId, reason) {
  const existing = await repo.findById(id);
  if (!existing) {
    const err = new Error("Scholarship not found");
    err.statusCode = 404;
    throw err;
  }
  const flag = await moderationRepo.createFlag({
    scholarshipId: id,
    flaggedByUserId: actorUserId,
    reason: reason || null,
  });
  return flag;
}

module.exports = {
  listScholarships,
  listPendingScholarships,
  getScholarshipById,
  verifyScholarship,
  rejectScholarship,
  flagScholarship,
};

