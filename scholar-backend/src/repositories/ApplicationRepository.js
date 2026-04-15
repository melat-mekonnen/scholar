const { query } = require("../infra/db/neonClient");

class ApplicationRepository {
  async findEligibleScholarshipById(scholarshipId) {
    const result = await query(
      `SELECT id, status
       FROM scholarships
       WHERE id = $1 AND status = 'verified'
       LIMIT 1`,
      [scholarshipId]
    );
    return result.rows[0] || null;
  }

  async findByUserAndScholarship(userId, scholarshipId) {
    const result = await query(
      `SELECT id, user_id, scholarship_id, status, created_at, updated_at
       FROM applications
       WHERE user_id = $1 AND scholarship_id = $2
       LIMIT 1`,
      [userId, scholarshipId]
    );
    return result.rows[0] || null;
  }

  async create({ userId, scholarshipId, status = "submitted" }) {
    const result = await query(
      `INSERT INTO applications (user_id, scholarship_id, status)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, scholarship_id, status, created_at, updated_at`,
      [userId, scholarshipId, status]
    );
    return result.rows[0] || null;
  }

  async listByUserId(userId) {
    const result = await query(
      `SELECT a.id,
              a.user_id,
              a.scholarship_id,
              a.status,
              a.created_at,
              a.updated_at,
              s.title AS scholarship_title,
              s.country AS scholarship_country,
              s.deadline AS scholarship_deadline,
              s.application_url AS scholarship_application_url
       FROM applications a
       INNER JOIN scholarships s ON s.id = a.scholarship_id
       WHERE a.user_id = $1
       ORDER BY a.updated_at DESC`,
      [userId]
    );
    return result.rows;
  }

  async findByIdAndUserId(id, userId) {
    const result = await query(
      `SELECT id, user_id, scholarship_id, status, created_at, updated_at
       FROM applications
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [id, userId]
    );
    return result.rows[0] || null;
  }

  async updateStatus(id, userId, status) {
    const result = await query(
      `UPDATE applications
       SET status = $3,
           updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING id, user_id, scholarship_id, status, created_at, updated_at`,
      [id, userId, status]
    );
    return result.rows[0] || null;
  }
}

module.exports = { ApplicationRepository };

