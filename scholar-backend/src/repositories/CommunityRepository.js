const { query } = require("../infra/db/neonClient");

const CHANNEL_WITH_PIN_SELECT = `
  c.id,
  c.slug,
  c.name,
  c.description,
  c.sort_order,
  c.is_active,
  c.created_at,
  c.pinned_message_id,
  c.pinned_at,
  pm.id AS pinned_msg_id,
  pm.body AS pinned_msg_body,
  pm.created_at AS pinned_msg_created_at,
  pm.user_id AS pinned_msg_user_id,
  pu.full_name AS pinned_msg_author_full_name
`;

class CommunityRepository {
  async listChannels({ includeInactive = false } = {}) {
    const where = includeInactive ? "" : "WHERE c.is_active = TRUE";
    const result = await query(
      `SELECT ${CHANNEL_WITH_PIN_SELECT}
       FROM community_channels c
       LEFT JOIN community_messages pm
         ON pm.id = c.pinned_message_id AND pm.is_hidden = FALSE
       LEFT JOIN users pu ON pu.id = pm.user_id
       ${where}
       ORDER BY c.sort_order ASC, c.name ASC`,
      [],
    );
    return result.rows;
  }

  async findChannelById(channelId) {
    const result = await query(
      `SELECT ${CHANNEL_WITH_PIN_SELECT}
       FROM community_channels c
       LEFT JOIN community_messages pm
         ON pm.id = c.pinned_message_id AND pm.is_hidden = FALSE
       LEFT JOIN users pu ON pu.id = pm.user_id
       WHERE c.id = $1
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
              m.edited_at,
              u.full_name AS author_full_name
       FROM community_messages m
       INNER JOIN users u ON u.id = m.user_id
       WHERE m.id = $1
       LIMIT 1`,
      [messageId],
    );
    return result.rows[0] || null;
  }

  async updateMessageBodyIfOwner(messageId, userId, body) {
    const result = await query(
      `UPDATE community_messages
       SET body = $3,
           edited_at = NOW()
       WHERE id = $1
         AND user_id = $2
         AND is_hidden = FALSE
       RETURNING id, channel_id, user_id, parent_message_id, body, created_at, edited_at`,
      [messageId, userId, body],
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
                m.edited_at,
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
              m.edited_at,
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

  async searchMessagesInChannel(channelId, searchText, { limit = 30 } = {}) {
    const q = String(searchText || "").trim();
    if (!q) return [];
    const lim = Math.min(Math.max(Number(limit) || 30, 1), 50);
    const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;

    const result = await query(
      `SELECT DISTINCT m.id,
              m.channel_id,
              m.user_id,
              m.parent_message_id,
              m.body,
              m.created_at,
              m.edited_at,
              u.full_name AS author_full_name
       FROM community_messages m
       INNER JOIN users u ON u.id = m.user_id
       LEFT JOIN community_message_attachments a ON a.message_id = m.id
       WHERE m.channel_id = $1
         AND m.is_hidden = FALSE
         AND (
           m.body ILIKE $2 ESCAPE '\\'
           OR u.full_name ILIKE $2 ESCAPE '\\'
           OR a.original_name ILIKE $2 ESCAPE '\\'
         )
       ORDER BY m.created_at DESC, m.id DESC
       LIMIT $3`,
      [channelId, pattern, lim],
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

  async listAttachmentsForMessages(messageIds) {
    if (!messageIds?.length) return [];
    const result = await query(
      `SELECT id, message_id, kind, file_path, original_name, mime_type, file_size, created_at
       FROM community_message_attachments
       WHERE message_id = ANY($1::uuid[])
       ORDER BY created_at ASC`,
      [messageIds],
    );
    return result.rows;
  }

  async listAttachmentsForMessage(messageId) {
    const result = await query(
      `SELECT id, message_id, kind, file_path, original_name, mime_type, file_size, created_at
       FROM community_message_attachments
       WHERE message_id = $1
       ORDER BY created_at ASC`,
      [messageId],
    );
    return result.rows;
  }

  async findAttachmentById(attachmentId) {
    const result = await query(
      `SELECT a.id,
              a.message_id,
              a.kind,
              a.file_path,
              a.original_name,
              a.mime_type,
              a.file_size,
              a.created_at,
              m.channel_id,
              m.is_hidden
       FROM community_message_attachments a
       INNER JOIN community_messages m ON m.id = a.message_id
       WHERE a.id = $1
       LIMIT 1`,
      [attachmentId],
    );
    return result.rows[0] || null;
  }

  async createAttachments(rows) {
    const created = [];
    for (const row of rows) {
      const result = await query(
        `INSERT INTO community_message_attachments
           (message_id, kind, file_path, original_name, mime_type, file_size)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, message_id, kind, file_path, original_name, mime_type, file_size, created_at`,
        [
          row.messageId,
          row.kind,
          row.filePath,
          row.originalName,
          row.mimeType,
          row.fileSize,
        ],
      );
      if (result.rows[0]) created.push(result.rows[0]);
    }
    return created;
  }

  async deleteAttachmentsForMessage(messageId) {
    const result = await query(
      `DELETE FROM community_message_attachments
       WHERE message_id = $1
       RETURNING file_path`,
      [messageId],
    );
    return result.rows;
  }

  async deleteMessageIfOwner(messageId, userId) {
    const pathsResult = await query(
      `SELECT file_path FROM community_message_attachments WHERE message_id = $1`,
      [messageId],
    );
    const result = await query(
      `DELETE FROM community_messages
       WHERE id = $1 AND user_id = $2
       RETURNING id, channel_id`,
      [messageId, userId],
    );
    const row = result.rows[0] || null;
    if (row) {
      row.file_paths = pathsResult.rows.map((r) => r.file_path);
    }
    return row;
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
    const row = result.rows[0] || null;
    if (row?.channel_id) {
      await query(
        `UPDATE community_channels
         SET pinned_message_id = NULL, pinned_at = NULL, pinned_by_user_id = NULL
         WHERE id = $1 AND pinned_message_id = $2`,
        [row.channel_id, messageId],
      );
    }
    return row;
  }

  async pinMessage({ channelId, messageId, userId }) {
    const result = await query(
      `UPDATE community_channels
       SET pinned_message_id = $2,
           pinned_at = NOW(),
           pinned_by_user_id = $3
       WHERE id = $1
       RETURNING id, pinned_message_id, pinned_at, pinned_by_user_id`,
      [channelId, messageId, userId],
    );
    return result.rows[0] || null;
  }

  async unpinMessage(channelId) {
    const result = await query(
      `UPDATE community_channels
       SET pinned_message_id = NULL,
           pinned_at = NULL,
           pinned_by_user_id = NULL
       WHERE id = $1
       RETURNING id`,
      [channelId],
    );
    return result.rows[0] || null;
  }
}

module.exports = { CommunityRepository };
