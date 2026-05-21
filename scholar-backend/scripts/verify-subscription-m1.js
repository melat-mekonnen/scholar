/**
 * Milestone 1 smoke test: migration + quota use cases against DATABASE_URL.
 * Run: npm run migrate:subscription && npm run verify:subscription-m1
 */
require("dotenv").config();
const { Pool } = require("pg");
const { checkAiChatQuota } = require("../src/usecases/subscription/checkAiChatQuota");
const { consumeAiChatQuota } = require("../src/usecases/subscription/consumeAiChatQuota");
const { SubscriptionRepository } = require("../src/repositories/SubscriptionRepository");
const { AiChatUsageRepository } = require("../src/repositories/AiChatUsageRepository");
const { getUsageDateString } = require("../src/usecases/subscription/usageDate");

const TEST_EMAIL =
  process.env.VERIFY_SUBSCRIPTION_EMAIL || "student.role.test@scholar.local";

function assertOk(cond, msg) {
  if (!cond) {
    throw new Error(msg);
  }
}

async function resetFreeUsage(pool, userId) {
  await pool.query("DELETE FROM ai_chat_usage WHERE user_id = $1", [userId]);
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const localDbPattern = /(localhost|127\.0\.0\.1)/i;
  const disableSslPattern = /sslmode=disable/i;
  const useSsl =
    !localDbPattern.test(databaseUrl) && !disableSslPattern.test(databaseUrl);

  const pool = new Pool({
    connectionString: databaseUrl,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  });

  const subRepo = new SubscriptionRepository();
  const usageRepo = new AiChatUsageRepository();

  try {
    const userRes = await pool.query(
      "SELECT id, email, role, subscription_plan FROM users WHERE email = $1 LIMIT 1",
      [TEST_EMAIL.toLowerCase()]
    );
    const user = userRes.rows[0];
    if (!user) {
      console.error(
        `No user found for ${TEST_EMAIL}. Run: npm run seed:test-roles (or set VERIFY_SUBSCRIPTION_EMAIL).`
      );
      process.exit(1);
    }

    console.log(`Using user: ${user.email} (${user.id}) role=${user.role}`);

    await subRepo.setPlan(user.id, {
      plan: "free",
      expiresAt: null,
      provider: null,
      externalId: null,
    });
    await resetFreeUsage(pool, user.id);

    let q = await checkAiChatQuota(user.id);
    assertOk(q.plan === "free" && q.allowed === true && q.remaining === 3, "free user should start with 3 remaining");
    console.log("OK: free user initial quota", { used: q.used, remaining: q.remaining });

    for (let i = 0; i < 3; i += 1) {
      await consumeAiChatQuota(user.id);
    }

    q = await checkAiChatQuota(user.id);
    assertOk(q.used === 3 && q.remaining === 0 && q.allowed === false, "after 3 consumes, quota exhausted");
    console.log("OK: free user blocked after 3 messages", { used: q.used, limit: q.limit });

    await subRepo.setPlan(user.id, {
      plan: "pro",
      expiresAt: null,
      provider: "manual",
      externalId: "verify-m1",
    });

    q = await checkAiChatQuota(user.id);
    assertOk(q.unlimited === true && q.allowed === true, "pro user should be unlimited");
    await consumeAiChatQuota(user.id);
    const countAfterPro = await usageRepo.getCount(user.id, getUsageDateString());
    assertOk(countAfterPro === 3, "pro consume should not increment usage");
    console.log("OK: pro user unlimited (usage count unchanged)", { countAfterPro });

    await subRepo.setPlan(user.id, {
      plan: "free",
      expiresAt: null,
      provider: null,
      externalId: null,
    });
    await resetFreeUsage(pool, user.id);
    console.log("OK: restored user to free and cleared test usage");

    console.log("\nMilestone 1 verification passed.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
