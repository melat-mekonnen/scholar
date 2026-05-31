require("dotenv").config();
const { env } = require("./config/env");
const { app } = require("./app");
const { startScholarshipExpiryJob } = require("./jobs/scholarshipExpiryJob");
const { startDeadlineReminderJob } = require("./jobs/deadlineReminderJob");
const { startApplicationFollowUpJob } = require("./jobs/applicationFollowUpJob");

const CHAT_SERVER_TIMEOUT_MS = 300_000;

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${env.port}`);
  startScholarshipExpiryJob();
  startDeadlineReminderJob();
  startApplicationFollowUpJob();
});

server.setTimeout(CHAT_SERVER_TIMEOUT_MS);
server.keepAliveTimeout = CHAT_SERVER_TIMEOUT_MS;
server.headersTimeout = CHAT_SERVER_TIMEOUT_MS + 10_000;

