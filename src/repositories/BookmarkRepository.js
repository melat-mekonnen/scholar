const { query } = require("../infra/db/neonClient");

class BookmarkRepository {
  async create(userId, scholarshipId) {
    const result = await query(
      `INSERT INTO bookmarks (user_id, scholarship_id)
       VALUES ($1, $2)
       RETURNING id, user_id, scholarship_id, created_at`,
      [userId, scholarshipId]
    );
    return result.rows[0];
  }

  async remove(userId, scholarshipId) {
    const result = await query(
      `DELETE FROM bookmarks
       WHERE user_id = $1 AND scholarship_id = $2`,
      [userId, scholarshipId]
    );
    return result.rowCount;
  }

  async listByUser(userId, page, limit) {
    const offset = (page - 1) * limit;
    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM bookmarks b
       INNER JOIN scholarships s ON s.id = b.scholarship_id
       WHERE b.user_id = $1 AND s.status = 'verified'`,
      [userId]
    );
    const total = Number(countResult.rows[0]?.total || 0);

    const listResult = await query(
      `SELECT s.id,
              s.title,
              s.country,
              s.degree_level,
              s.field_of_study,
              s.funding_type,
              s.deadline,
              s.amount,
              s.description,
              s.application_url,
              s.created_at,
              b.created_at AS bookmarked_at
       FROM bookmarks b
       INNER JOIN scholarships s ON s.id = b.scholarship_id
       WHERE b.user_id = $1 AND s.status = 'verified'
       ORDER BY b.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return { rows: listResult.rows, total, page, limit };
  }
}

module.exports = { BookmarkRepository };
