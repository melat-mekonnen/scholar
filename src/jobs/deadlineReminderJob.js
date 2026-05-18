const { runDeadlineReminderSweep } = require("../services/studentScholarshipNotifications");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function startDeadlineReminderJob() {
  const runOnStart = String(process.env.DEADLINE_REMINDER_RUN_ON_START || "false").toLowerCase() === "true";
  const intervalMs = Number(process.env.DEADLINE_REMINDER_INTERVAL_MS || ONE_DAY_MS);

  const run = () => {
    runDeadlineReminderSweep().catch((err) => {
      // eslint-disable-next-line no-console
      console.error("[deadlineReminderJob]", err.message || err);
    });
  };

  if (runOnStart) run();
  const timer = setInterval(run, intervalMs);
  if (typeof timer.unref === "function") timer.unref();
  return timer;
}

module.exports = { startDeadlineReminderJob, runDeadlineReminderSweep };
