const { env } = require("./config/env");
const { app } = require("./app");
const { startScholarshipExpiryJob } = require("./jobs/scholarshipExpiryJob");

app.listen(env.port, () => {
  startScholarshipExpiryJob();
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${env.port}`);
});

