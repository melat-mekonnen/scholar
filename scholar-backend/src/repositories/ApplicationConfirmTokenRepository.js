const { query } = require("../infra/db/neonClient");

class ApplicationConfirmTokenRepository {
  async create({ applicationId, userId, tokenHash, expiresAt }) {
    await query(
      `DELETE FROM application_confirm_tokens
       WHERE application_id = $1 AND used_at IS NULL`,
      [applicationId],
    );
    const result = await query(
      `INSERT INTO application_confirm_tokens (application_id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, application_id, user_id, expires_at, created_at`,
      [applicationId, userId, tokenHash, expiresAt],
    );
    return result.rows[0];
  }

  async findValidByTokenHash(tokenHash) {
    const result = await query(
      `SELECT t.id AS token_id,
              t.application_id,
              t.user_id,
              t.expires_at,
              a.status AS application_status,
              s.title AS scholarship_title
       FROM application_confirm_tokens t
       INNER JOIN applications a ON a.id = t.application_id
       INNER JOIN scholarships s ON s.id = a.scholarship_id
       WHERE t.token_hash = $1
         AND t.used_at IS NULL
         AND t.expires_at > NOW()
       LIMIT 1`,
      [tokenHash],
    );
    return result.rows[0] || null;
  }

  async markUsed(tokenId) {
    await query(
      `UPDATE application_confirm_tokens
       SET used_at = NOW()
       WHERE id = $1`,
      [tokenId],
    );
  }
}

module.exports = { ApplicationConfirmTokenRepository };
