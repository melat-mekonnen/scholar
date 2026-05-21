const { query } = require("../infra/db/neonClient");

class AiChatUsageRepository {
  async getCount(userId, usageDate) {
    const result = await query(
      `SELECT request_count
       FROM ai_chat_usage
       WHERE user_id = $1 AND usage_date = $2
       LIMIT 1`,
      [userId, usageDate]
    );
    const row = result.rows[0];
    return row ? Number(row.request_count) : 0;
  }

  async increment(userId, usageDate) {
    const result = await query(
      `INSERT INTO ai_chat_usage (user_id, usage_date, request_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, usage_date)
       DO UPDATE SET request_count = ai_chat_usage.request_count + 1
       RETURNING request_count`,
      [userId, usageDate]
    );
    return Number(result.rows[0].request_count);
  }
}

module.exports = { AiChatUsageRepository };
