const { query } = require("../infra/db/neonClient");

class ScholarshipModerationRepository {
  async createFlag({ scholarshipId, flaggedByUserId, reason }) {
    const result = await query(
      `INSERT INTO scholarship_flags (scholarship_id, flagged_by_user_id, reason)
       VALUES ($1, $2, $3)
       RETURNING id, scholarship_id, flagged_by_user_id, reason, created_at`,
      [scholarshipId, flaggedByUserId, reason || null],
    );
    return result.rows[0] || null;
  }

  async createNotification({ userId, scholarshipId, type, message }) {
    const result = await query(
      `INSERT INTO scholarship_notifications (user_id, scholarship_id, type, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, scholarship_id, type, message, is_read, created_at`,
      [userId, scholarshipId, type, message],
    );
    return result.rows[0] || null;
  }

  async listNotificationsByUser(userId, { limit = 30, onlyUnread = false } = {}) {
    const params = [userId, limit];
    let where = "WHERE user_id = $1";
    if (onlyUnread) {
      where += " AND is_read = FALSE";
    }
    const result = await query(
      `SELECT id, scholarship_id, type, message, is_read, created_at
       FROM scholarship_notifications
       ${where}
       ORDER BY created_at DESC
       LIMIT $2`,
      params,
    );
    return result.rows;
  }

  async markAllRead(userId) {
    await query(
      `UPDATE scholarship_notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId],
    );
  }
}

module.exports = { ScholarshipModerationRepository };
