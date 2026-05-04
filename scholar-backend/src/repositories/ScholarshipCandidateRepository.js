const { query } = require("../infra/db/neonClient");

class ScholarshipCandidateRepository {
  async saveRawRssItem({ feedName, itemTitle, itemUrl, publishedAt }) {
    const result = await query(
      `INSERT INTO scholarship_candidate_raw_items (feed_name, item_title, item_url, published_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (item_url) DO NOTHING
       RETURNING id`,
      [feedName, itemTitle || null, itemUrl, publishedAt || null],
    );
    return result.rows[0] || null;
  }

  async listUnprocessedRawItems(limit = 50) {
    const result = await query(
      `SELECT id, feed_name, item_title, item_url, published_at
       FROM scholarship_candidate_raw_items
       WHERE processed_at IS NULL
       ORDER BY collected_at ASC
       LIMIT $1`,
      [limit],
    );
    return result.rows;
  }

  async markRawItemProcessed(id, error = null) {
    await query(
      `UPDATE scholarship_candidate_raw_items
       SET processed_at = NOW(), process_error = $2
       WHERE id = $1`,
      [id, error || null],
    );
  }

  async insertCandidate({
    title,
    url,
    university,
    deadline,
    description,
    extractedData,
    score,
  }) {
    const result = await query(
      `INSERT INTO scholarship_candidates (
         title, url, university, deadline, description, extracted_data, score, status
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
       ON CONFLICT (url)
       DO UPDATE SET
         title = EXCLUDED.title,
         university = EXCLUDED.university,
         deadline = EXCLUDED.deadline,
         description = EXCLUDED.description,
         extracted_data = EXCLUDED.extracted_data,
         score = EXCLUDED.score
       RETURNING id, title, url, university, deadline, score, status, created_at`,
      [
        title,
        url,
        university || null,
        deadline || null,
        description || null,
        extractedData || {},
        Number(score) || 0,
      ],
    );
    return result.rows[0] || null;
  }

  async listPendingCandidates() {
    const result = await query(
      `SELECT id, title, url, university, deadline, description, extracted_data, score, status, created_at
       FROM scholarship_candidates
       WHERE status = 'pending'
       ORDER BY created_at DESC`,
      [],
    );
    return result.rows;
  }

  async findCandidateById(id) {
    const result = await query(
      `SELECT id, title, url, university, deadline, description, extracted_data, score, status, created_at
       FROM scholarship_candidates
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    return result.rows[0] || null;
  }

  async setCandidateStatus(id, status) {
    const result = await query(
      `UPDATE scholarship_candidates
       SET status = $2
       WHERE id = $1
       RETURNING id, status`,
      [id, status],
    );
    return result.rows[0] || null;
  }

  async approveCandidateToScholarship(id) {
    const candidate = await this.findCandidateById(id);
    if (!candidate) return null;

    await query("BEGIN", []);
    try {
      const insertResult = await query(
        `INSERT INTO scholarships (
           title,
           organization_name,
           country,
           deadline,
           description,
           application_url,
           source_name,
           source_url,
           status,
           discovered_at,
           ai_confidence
         )
         VALUES ($1, $2, $3, $4, $5, $6, 'RSS discovery', $6, 'verified', NOW(), $7)
         ON CONFLICT (source_url)
         DO UPDATE SET
           title = EXCLUDED.title,
           organization_name = EXCLUDED.organization_name,
           deadline = EXCLUDED.deadline,
           description = EXCLUDED.description,
           status = 'verified',
           discovered_at = NOW(),
           ai_confidence = EXCLUDED.ai_confidence,
           updated_at = NOW()
         RETURNING id, title, status`,
        [
          candidate.title,
          candidate.university || null,
          candidate.extracted_data?.country || "International",
          candidate.deadline || null,
          candidate.description || null,
          candidate.url,
          Math.max(0, Math.min(1, Number(candidate.score || 0) / 100)),
        ],
      );

      await query(
        `UPDATE scholarship_candidates
         SET status = 'approved'
         WHERE id = $1`,
        [id],
      );
      await query("COMMIT", []);
      return insertResult.rows[0] || null;
    } catch (err) {
      await query("ROLLBACK", []);
      throw err;
    }
  }
}

module.exports = { ScholarshipCandidateRepository };

