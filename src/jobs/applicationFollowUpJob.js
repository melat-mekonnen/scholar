const { runApplicationFollowUpSweep } = require("../services/studentScholarshipNotifications");

const DEFAULT_INTERVAL_MS = 15 * 60 * 1000;

function startApplicationFollowUpJob() {
  const runOnStart = String(process.env.APPLY_FOLLOWUP_RUN_ON_START || "false").toLowerCase() === "true";
  const intervalMs = Number(process.env.APPLY_FOLLOWUP_INTERVAL_MS || DEFAULT_INTERVAL_MS);

  const run = () => {
    runApplicationFollowUpSweep().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[applicationFollowUpJob]", err.message || err);
    });
  };

  if (runOnStart) run();
  const timer = setInterval(run, intervalMs);
  if (typeof timer.unref === "function") timer.unref();
  return timer;
}

module.exports = { startApplicationFollowUpJob, runApplicationFollowUpSweep };
