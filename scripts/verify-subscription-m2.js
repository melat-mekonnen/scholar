/**
 * Milestone 2: HTTP quota on /api/chatbot (API must be running).
 * Run: npm run dev (separate terminal) && npm run verify:subscription-m2
 */
const axios = require("axios");
require("dotenv").config();
const { Pool } = require("pg");

const BASE =
  process.env.VERIFY_API_BASE_URL ||
  `http://127.0.0.1:${process.env.PORT || "4000"}`;
const PASSWORD = process.env.TEST_USER_PASSWORD || "ScholarTest1!";
const STUDENT_EMAIL =
  process.env.VERIFY_SUBSCRIPTION_EMAIL || "student.role.test@scholar.local";

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

async function login(email) {
  const { data, status } = await axios.post(
    `${BASE}/api/auth/login`,
    { email, password: PASSWORD },
    { validateStatus: () => true }
  );
  return { data, status };
}

async function resetFreeUser(pool, email) {
  const userRes = await pool.query("SELECT id FROM users WHERE email = $1", [
    email.toLowerCase(),
  ]);
  const user = userRes.rows[0];
  if (!user) throw new Error(`User not found: ${email}`);
  await pool.query(
    `UPDATE users SET subscription_plan = 'free', subscription_expires_at = NULL,
     subscription_provider = NULL, subscription_external_id = NULL WHERE id = $1`,
    [user.id]
  );
  await pool.query("DELETE FROM ai_chat_usage WHERE user_id = $1", [user.id]);
  return user.id;
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

  try {
    await resetFreeUser(pool, STUDENT_EMAIL);

    const auth = await login(STUDENT_EMAIL);
    if (auth.status !== 200 || !auth.data?.token) {
      console.error("FAIL login", auth.status, auth.data);
      console.error("Start the API: npm run dev");
      process.exit(1);
    }
    const token = auth.data.token;

    const quotaRes = await axios.get(`${BASE}/api/chatbot/quota`, {
      headers: authHeaders(token),
      validateStatus: () => true,
    });
    if (quotaRes.status !== 200) {
      console.error("FAIL GET /api/chatbot/quota", quotaRes.status, quotaRes.data);
      process.exit(1);
    }
    if (quotaRes.data.plan !== "free" || quotaRes.data.remaining !== 3) {
      console.error("FAIL quota shape", quotaRes.data);
      process.exit(1);
    }
    console.log("OK: GET /api/chatbot/quota", quotaRes.data);

    let blocked = false;
    for (let i = 1; i <= 4; i += 1) {
      const chatRes = await axios.post(
        `${BASE}/api/chatbot/query`,
        { message: `quota test message ${i}`, topK: 3 },
        { headers: authHeaders(token), validateStatus: () => true, timeout: 120000 }
      );
      if (i <= 3) {
        if (chatRes.status !== 200 && chatRes.status !== 503) {
          console.error(`FAIL message ${i} expected 200 or 503`, chatRes.status, chatRes.data);
          process.exit(1);
        }
        console.log(`OK: message ${i} allowed (status ${chatRes.status})`);
      } else if (chatRes.status === 402 && chatRes.data?.code === "CHAT_QUOTA_EXCEEDED") {
        blocked = true;
        console.log("OK: message 4 blocked with 402 CHAT_QUOTA_EXCEEDED", chatRes.data);
      } else {
        console.error("FAIL message 4 expected 402", chatRes.status, chatRes.data);
        process.exit(1);
      }
    }

    if (!blocked) {
      console.error("FAIL: 4th message was not blocked");
      process.exit(1);
    }

    const quotaAfter = await axios.get(`${BASE}/api/chatbot/quota`, {
      headers: authHeaders(token),
      validateStatus: () => true,
    });
    if (quotaAfter.data.remaining !== 0) {
      console.error("FAIL remaining after use", quotaAfter.data);
      process.exit(1);
    }
    console.log("OK: quota remaining 0 after 3 messages");

    await pool.query(
      "DELETE FROM ai_chat_usage WHERE user_id IN (SELECT id FROM users WHERE email = $1)",
      [STUDENT_EMAIL.toLowerCase()]
    );
    console.log("\nMilestone 2 verification passed.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
