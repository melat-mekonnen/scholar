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

  async record(userId, description) {
    if (!userId || !description) return null;
    const result = await query(
      `INSERT INTO user_activity (user_id, description)
       VALUES ($1, $2)
       RETURNING id, description, created_at`,
      [userId, description]
    );
    return result.rows[0] || null;
  }

  /** Build activity feed from applications and bookmarks when user_activity is empty. */
  async getDerivedRecent(userId, limit = 3) {
    const result = await query(
      `SELECT description, created_at
       FROM (
         SELECT
           CASE a.status
             WHEN 'submitted' THEN 'Submitted application: ' || s.title
             WHEN 'accepted' THEN 'Application accepted: ' || s.title
             WHEN 'rejected' THEN 'Application not selected: ' || s.title
             ELSE 'Started application: ' || s.title
           END AS description,
           a.updated_at AS created_at
         FROM applications a
         INNER JOIN scholarships s ON s.id = a.scholarship_id
         WHERE a.user_id = $1
         UNION ALL
         SELECT 'Saved scholarship: ' || s.title AS description,
                b.created_at AS created_at
         FROM bookmarks b
         INNER JOIN scholarships s ON s.id = b.scholarship_id
         WHERE b.user_id = $1
       ) events
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }
}

module.exports = { UserActivityRepository };

