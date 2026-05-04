const { env } = require("./config/env");
const { app } = require("./app");
const { startDiscoveryScheduler } = require("./services/discoveryScheduler");

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${env.port}`);
  startDiscoveryScheduler();
});

