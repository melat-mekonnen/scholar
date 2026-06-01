const { env } = require("./config/env");
const { app } = require("./app");
const { startScholarshipExpiryJob } = require("./jobs/scholarshipExpiryJob");
const { startDeadlineReminderJob } = require("./jobs/deadlineReminderJob");
const { startApplicationFollowUpJob } = require("./jobs/applicationFollowUpJob");

const CHAT_SERVER_TIMEOUT_MS = 300_000;

const jobsEnabled = String(process.env.BACKGROUND_JOBS_ENABLED || "true").toLowerCase() !== "false";

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${env.port} (${env.nodeEnv})`);
  if (!jobsEnabled) {
    // eslint-disable-next-line no-console
    console.log("[jobs] BACKGROUND_JOBS_ENABLED=false — cron-style jobs not started");
    return;
  }
  startScholarshipExpiryJob();
  const deadlineTimer = startDeadlineReminderJob();
  const followUpTimer = startApplicationFollowUpJob();
  // eslint-disable-next-line no-console
  console.log(
    `[jobs] expiry=on reminders=${deadlineTimer ? "on" : "off"} follow-up=${followUpTimer ? "on" : "off"}`,
  );
});

server.setTimeout(CHAT_SERVER_TIMEOUT_MS);
server.keepAliveTimeout = CHAT_SERVER_TIMEOUT_MS;
server.headersTimeout = CHAT_SERVER_TIMEOUT_MS + 10_000;

