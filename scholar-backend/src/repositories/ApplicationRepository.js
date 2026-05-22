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

  async create({ userId, scholarshipId, status = "pending" }) {
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
              s.title_am AS scholarship_title_am,
              s.description_am AS scholarship_description_am,
              s.organization_name AS scholarship_organization_name,
              s.organization_name_am AS scholarship_organization_name_am,
              s.country AS scholarship_country,
              s.country_am AS scholarship_country_am,
              s.field_of_study AS scholarship_field_of_study,
              s.field_of_study_am AS scholarship_field_of_study_am,
              s.application_start_date AS scholarship_start_date,
              s.application_end_date AS scholarship_end_date,
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

  async markFollowUpSent(id) {
    await query(
      `UPDATE applications
       SET follow_up_sent_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [id],
    );
  }

  async listPendingForFollowUp(minAgeMinutes) {
    const result = await query(
      `SELECT a.id,
              a.user_id,
              a.scholarship_id,
              a.status,
              a.created_at,
              u.email AS user_email,
              u.full_name AS user_full_name,
              s.title AS scholarship_title
       FROM applications a
       INNER JOIN users u ON u.id = a.user_id
       INNER JOIN scholarships s ON s.id = a.scholarship_id
       INNER JOIN bookmarks b
         ON b.user_id = a.user_id AND b.scholarship_id = a.scholarship_id
       LEFT JOIN student_notification_preferences p ON p.user_id = a.user_id
       WHERE a.status = 'pending'
         AND a.follow_up_sent_at IS NULL
         AND a.created_at <= NOW() - ($1::int * INTERVAL '1 minute')
         AND (p.apply_followups IS NULL OR p.apply_followups = TRUE)
       ORDER BY a.created_at ASC
       LIMIT 200`,
      [minAgeMinutes],
    );
    return result.rows;
  }
}

module.exports = { ApplicationRepository };

