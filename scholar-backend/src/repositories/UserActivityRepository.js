const { query } = require("../infra/db/neonClient");

class UserActivityRepository {
  async getRecentByUserId(userId, limit = 3) {
    const result = await query(
      `SELECT id, description, created_at
       FROM user_activity
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }
}

module.exports = { UserActivityRepository };

