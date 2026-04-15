const { query } = require("../infra/db/neonClient");

class DocumentRepository {
  async create({
    id,
    title,
    type,
    filePath,
    originalName,
    mimeType,
    fileSize,
    scholarshipId,
    uploadedByUserId,
  }) {
    const result = await query(
      `INSERT INTO documents (
         id,
         title,
         type,
         file_path,
         original_name,
         mime_type,
         file_size,
         scholarship_id,
         uploaded_by_user_id
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, title, type, original_name, mime_type, file_size, scholarship_id, uploaded_by_user_id, download_count, created_at, updated_at`,
      [
        id,
        title,
        type,
        filePath,
        originalName,
        mimeType,
        fileSize,
        scholarshipId,
        uploadedByUserId,
      ]
    );
    return result.rows[0] || null;
  }

  async list({ q, type, scholarshipId, uploadedByUserId }) {
    const params = [];
    const where = [];

    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      where.push(
        `(LOWER(d.title) LIKE $${params.length} OR LOWER(d.original_name) LIKE $${params.length})`
      );
    }
    if (type) {
      params.push(type);
      where.push(`d.type = $${params.length}`);
    }
    if (scholarshipId) {
      params.push(scholarshipId);
      where.push(`d.scholarship_id = $${params.length}`);
    }
    if (uploadedByUserId) {
      params.push(uploadedByUserId);
      where.push(`d.uploaded_by_user_id = $${params.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await query(
      `SELECT d.id,
              d.title,
              d.type,
              d.original_name,
              d.mime_type,
              d.file_size,
              d.scholarship_id,
              d.uploaded_by_user_id,
              d.download_count,
              d.created_at,
              d.updated_at,
              u.full_name AS uploaded_by_name
       FROM documents d
       LEFT JOIN users u ON u.id = d.uploaded_by_user_id
       ${whereClause}
       ORDER BY d.created_at DESC`,
      params
    );
    return result.rows;
  }

  async findById(id) {
    const result = await query(
      `SELECT d.id,
              d.title,
              d.type,
              d.file_path,
              d.original_name,
              d.mime_type,
              d.file_size,
              d.scholarship_id,
              d.uploaded_by_user_id,
              d.download_count,
              d.created_at,
              d.updated_at,
              u.full_name AS uploaded_by_name
       FROM documents d
       LEFT JOIN users u ON u.id = d.uploaded_by_user_id
       WHERE d.id = $1
       LIMIT 1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async incrementDownloadCount(id) {
    await query(
      `UPDATE documents
       SET download_count = download_count + 1, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  async update(id, { title, type }) {
    const result = await query(
      `UPDATE documents
       SET title = COALESCE($2, title),
           type = COALESCE($3, type),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, type, original_name, mime_type, file_size, scholarship_id, uploaded_by_user_id, download_count, created_at, updated_at`,
      [id, title, type]
    );
    return result.rows[0] || null;
  }

  async delete(id) {
    const result = await query(
      `DELETE FROM documents
       WHERE id = $1
       RETURNING id, file_path`,
      [id]
    );
    return result.rows[0] || null;
  }

  async isScholarshipOwnedByManager(scholarshipId, managerId) {
    const result = await query(
      `SELECT 1
       FROM scholarships
       WHERE id = $1 AND posted_by_user_id = $2
       LIMIT 1`,
      [scholarshipId, managerId]
    );
    return Boolean(result.rows[0]);
  }
}

module.exports = { DocumentRepository };

