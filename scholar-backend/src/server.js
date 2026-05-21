const { env } = require("./config/env");
const { app } = require("./app");
const { startScholarshipExpiryJob } = require("./jobs/scholarshipExpiryJob");
const { startDeadlineReminderJob } = require("./jobs/deadlineReminderJob");
const { startApplicationFollowUpJob } = require("./jobs/applicationFollowUpJob");

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${env.port}`);
  startScholarshipExpiryJob();
  startDeadlineReminderJob();
  startApplicationFollowUpJob();
});

