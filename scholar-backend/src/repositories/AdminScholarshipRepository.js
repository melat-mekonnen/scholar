const { query } = require("../infra/db/neonClient");

class AdminScholarshipRepository {
  async list({ search, status }) {
    const params = [];
    const where = [];

    const normalizedStatus =
      !status || status === "all"
        ? null
        : String(status)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

    if (normalizedStatus?.length) {
      params.push(normalizedStatus);
      where.push(`status = ANY($${params.length})`);
    }

    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      const p = `$${params.length}`;
      where.push(`(LOWER(title) LIKE ${p} OR LOWER(country) LIKE ${p})`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await query(
      `SELECT id, title, country, degree_level, funding_type, deadline, status
       FROM scholarships
       ${whereClause}
       ORDER BY created_at DESC`,
      params
    );

    return result.rows;
  }

  async listPending({ search }) {
    const params = [];
    let where = "WHERE status = 'pending'";

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      where += ` AND (LOWER(title) LIKE $${params.length} OR LOWER(country) LIKE $${params.length})`;
    }

    const result = await query(
      `SELECT id, title, country, degree_level, funding_type, deadline, status
       FROM scholarships
       ${where}
       ORDER BY deadline ASC NULLS LAST`,
      params
    );

    return result.rows;
  }

  async findById(id) {
    const result = await query(
      `SELECT s.id,
              s.title,
              s.country,
              s.degree_level,
              s.status,
              s.deadline,
              s.funding_type,
              s.field_of_study,
              s.amount,
              s.description,
              s.application_url,
              s.rejection_reason,
              s.created_at,
              s.updated_at,
              u.id AS posted_by_id,
              u.full_name AS posted_by_full_name,
              u.email AS posted_by_email
       FROM scholarships s
       LEFT JOIN users u ON s.posted_by_user_id = u.id
       WHERE s.id = $1
       LIMIT 1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async updateStatus(id, status, rejectionReason = null) {
    const result = await query(
      `UPDATE scholarships
       SET status = $2,
           rejection_reason = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, status, rejection_reason`,
      [id, status, rejectionReason]
    );
    return result.rows[0] || null;
  }
}

module.exports = { AdminScholarshipRepository };

