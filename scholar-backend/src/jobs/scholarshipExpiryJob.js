const { ScholarshipRepository } = require("../repositories/ScholarshipRepository");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function runScholarshipExpirySweep() {
  const repo = new ScholarshipRepository();
  await repo.expirePastDeadline();
}

function startScholarshipExpiryJob() {
  const runOnStart = String(process.env.SCHOLARSHIP_EXPIRY_RUN_ON_START || "true").toLowerCase() !== "false";
  const intervalMs = Number(process.env.SCHOLARSHIP_EXPIRY_INTERVAL_MS || ONE_DAY_MS);
  if (runOnStart) {
    runScholarshipExpirySweep().catch(() => {});
  }
  const timer = setInterval(() => {
    runScholarshipExpirySweep().catch(() => {});
  }, intervalMs);
  if (typeof timer.unref === "function") timer.unref();
  return timer;
}

module.exports = {
  runScholarshipExpirySweep,
  startScholarshipExpiryJob,
};
