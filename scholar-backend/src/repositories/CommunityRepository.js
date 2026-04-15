const { query } = require("../infra/db/neonClient");

class CommunityRepository {
  async listChannels() {
    const result = await query(
      `SELECT id, slug, name, description, sort_order, created_at
       FROM community_channels
       ORDER BY sort_order ASC, name ASC`,
      [],
    );
    return result.rows;
  }

  async findChannelById(channelId) {
    const result = await query(
      `SELECT id, slug, name, description, sort_order
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
         WHERE m.channel_id = $1 AND m.created_at < $2::timestamptz
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
}

module.exports = { CommunityRepository };
