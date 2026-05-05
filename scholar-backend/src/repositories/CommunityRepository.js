const { query } = require("../infra/db/neonClient");

class CommunityRepository {
  async listChannels({ includeInactive = false } = {}) {
    const where = includeInactive ? "" : "WHERE is_active = TRUE";
    const result = await query(
      `SELECT id, slug, name, description, sort_order, is_active, created_at
       FROM community_channels
       ${where}
       ORDER BY sort_order ASC, name ASC`,
      [],
    );
    return result.rows;
  }

  async findChannelById(channelId) {
    const result = await query(
      `SELECT id, slug, name, description, sort_order, is_active
       FROM community_channels
       WHERE id = $1
       LIMIT 1`,
      [channelId],
    );
    return result.rows[0] || null;
  }

  async findMessageById(messageId) {
    const result = await query(
      `SELECT id, channel_id, user_id, parent_message_id, body, created_at
       FROM community_messages
       WHERE id = $1
       LIMIT 1`,
      [messageId],
    );
    return result.rows[0] || null;
  }

  async findMessageWithAuthor(messageId) {
    const result = await query(
      `SELECT m.id,
              m.channel_id,
              m.user_id,
              m.parent_message_id,
              m.body,
              m.created_at,
              u.full_name AS author_full_name
       FROM community_messages m
       INNER JOIN users u ON u.id = m.user_id
       WHERE m.id = $1
       LIMIT 1`,
      [messageId],
    );
    return result.rows[0] || null;
  }

  /**
   * Newest-first page; use `before` (ISO timestamp) to load older messages.
   */
  async listMessagesForChannel(channelId, { before = null, limit = 40 } = {}) {
    const lim = Math.min(Math.max(Number(limit) || 40, 1), 80);
    if (before) {
      const result = await query(
        `SELECT m.id,
                m.channel_id,
                m.user_id,
                m.parent_message_id,
                m.body,
                m.created_at,
                u.full_name AS author_full_name
         FROM community_messages m
         INNER JOIN users u ON u.id = m.user_id
         WHERE m.channel_id = $1
           AND m.is_hidden = FALSE
           AND m.created_at < $2::timestamptz
         ORDER BY m.created_at DESC, m.id DESC
         LIMIT $3`,
        [channelId, before, lim],
      );
      return result.rows;
    }
    const result = await query(
      `SELECT m.id,
              m.channel_id,
              m.user_id,
              m.parent_message_id,
              m.body,
              m.created_at,
              u.full_name AS author_full_name
       FROM community_messages m
       INNER JOIN users u ON u.id = m.user_id
       WHERE m.channel_id = $1
         AND m.is_hidden = FALSE
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT $2`,
      [channelId, lim],
    );
    return result.rows;
  }

  async createMessage({ channelId, userId, body, parentMessageId = null }) {
    const result = await query(
      `INSERT INTO community_messages (channel_id, user_id, parent_message_id, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, channel_id, user_id, parent_message_id, body, created_at`,
      [channelId, userId, parentMessageId, body],
    );
    return result.rows[0] || null;
  }

  async deleteMessageIfOwner(messageId, userId) {
    const result = await query(
      `DELETE FROM community_messages
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [messageId, userId],
    );
    return result.rows[0] || null;
  }

  async reportMessage({ messageId, reporterUserId, reason }) {
    const result = await query(
      `INSERT INTO community_reports (message_id, reporter_user_id, reason)
       VALUES ($1, $2, $3)
       RETURNING id, message_id, reporter_user_id, reason, status, created_at`,
      [messageId, reporterUserId, reason],
    );
    return result.rows[0] || null;
  }

  async createChannel({ slug, name, description = null, sortOrder = 0, isActive = true }) {
    const result = await query(
      `INSERT INTO community_channels (slug, name, description, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, slug, name, description, sort_order, is_active, created_at`,
      [slug, name, description, sortOrder, isActive],
    );
    return result.rows[0] || null;
  }

  async updateChannel(id, patch = {}) {
    const result = await query(
      `UPDATE community_channels
       SET slug = COALESCE($2, slug),
           name = COALESCE($3, name),
           description = COALESCE($4, description),
           sort_order = COALESCE($5, sort_order),
           is_active = COALESCE($6, is_active)
       WHERE id = $1
       RETURNING id, slug, name, description, sort_order, is_active, created_at`,
      [
        id,
        patch.slug ?? null,
        patch.name ?? null,
        patch.description ?? null,
        patch.sortOrder ?? null,
        patch.isActive ?? null,
      ],
    );
    return result.rows[0] || null;
  }

  async listReports({ status = "open", limit = 50 } = {}) {
    const result = await query(
      `SELECT r.id,
              r.message_id,
              r.reporter_user_id,
              r.reason,
              r.status,
              r.created_at,
              m.channel_id,
              m.body AS message_body,
              m.user_id AS message_author_id,
              reporter.full_name AS reporter_full_name,
              author.full_name AS author_full_name
       FROM community_reports r
       INNER JOIN community_messages m ON m.id = r.message_id
       INNER JOIN users reporter ON reporter.id = r.reporter_user_id
       INNER JOIN users author ON author.id = m.user_id
       WHERE r.status = $1
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [status, limit],
    );
    return result.rows;
  }

  async resolveReport(id, reviewedByUserId, status) {
    const result = await query(
      `UPDATE community_reports
       SET status = $3,
           reviewed_by_user_id = $2,
           reviewed_at = NOW()
       WHERE id = $1
       RETURNING id, status, reviewed_by_user_id, reviewed_at`,
      [id, reviewedByUserId, status],
    );
    return result.rows[0] || null;
  }

  async hideMessageByOwner(messageId, ownerUserId) {
    const result = await query(
      `UPDATE community_messages
       SET is_hidden = TRUE,
           hidden_by_user_id = $2,
           hidden_at = NOW()
       WHERE id = $1
       RETURNING id, channel_id, is_hidden, hidden_by_user_id, hidden_at`,
      [messageId, ownerUserId],
    );
    return result.rows[0] || null;
  }
}

module.exports = { CommunityRepository };
