const cron = require("node-cron");
const { env } = require("../config/env");
const { runCandidateDiscoveryCycle } = require("./discovery/candidatePipelineService");

let job = null;

function startDiscoveryScheduler() {
  if (!env.discoveryCronEnabled || job) return;

  job = cron.schedule(env.discoveryCronExpression, async () => {
    try {
      await runCandidateDiscoveryCycle({ limit: env.discoveryProcessBatchSize });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Discovery cron run failed:", err.message || err);
    }
  });

  // eslint-disable-next-line no-console
  console.log(`Discovery scheduler started: ${env.discoveryCronExpression}`);
}

module.exports = { startDiscoveryScheduler };

