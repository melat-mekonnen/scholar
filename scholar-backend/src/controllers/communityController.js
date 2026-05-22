const fs = require("fs");
const path = require("path");
const { CommunityRepository } = require("../repositories/CommunityRepository");
const communityEvents = require("../services/communityEvents");
const {
  validateUploadedFile,
  unlinkFiles,
  MAX_FILES_PER_MESSAGE,
} = require("../utils/communityAttachments");

const repo = new CommunityRepository();

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const MODERATOR_ROLES = new Set(["admin", "manager", "owner"]);

function isModerator(user) {
  return Boolean(user?.role && MODERATOR_ROLES.has(user.role));
}

function mapAttachmentRow(row) {
  return {
    id: row.id,
    messageId: row.message_id,
    kind: row.kind,
    originalName: row.original_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size) || 0,
    url: `/api/community/attachments/${row.id}`,
  };
}

function mapMessageRow(row, attachments = []) {
  return {
    id: row.id,
    channelId: row.channel_id,
    userId: row.user_id,
    parentMessageId: row.parent_message_id,
    body: row.body,
    createdAt: row.created_at,
    editedAt: row.edited_at ?? null,
    authorFullName: row.author_full_name,
    attachments,
  };
}

function groupAttachmentsByMessageId(attachmentRows) {
  const map = new Map();
  for (const row of attachmentRows) {
    const mapped = mapAttachmentRow(row);
    const list = map.get(row.message_id) || [];
    list.push(mapped);
    map.set(row.message_id, list);
  }
  return map;
}

function mapPinnedMessage(row) {
  if (!row?.pinned_msg_id) return null;
  return {
    id: row.pinned_msg_id,
    channelId: row.id,
    userId: row.pinned_msg_user_id,
    parentMessageId: null,
    body: row.pinned_msg_body,
    createdAt: row.pinned_msg_created_at,
    authorFullName: row.pinned_msg_author_full_name,
    pinnedAt: row.pinned_at,
  };
}

function mapChannelRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    pinnedMessage: mapPinnedMessage(row),
  };
}

async function listChannels(req, res, next) {
  try {
    const rows = await repo.listChannels();
    return res.json({
      channels: rows.map(mapChannelRow),
    });
  } catch (err) {
    return next(err);
  }
}

async function searchMessages(req, res, next) {
  try {
    const channelId = String(req.params.channelId || "");
    if (!UUID_V4.test(channelId)) {
      const err = new Error("Invalid channel id");
      err.statusCode = 400;
      throw err;
    }

    const channel = await repo.findChannelById(channelId);
    if (!channel) {
      const err = new Error("Channel not found");
      err.statusCode = 404;
      throw err;
    }

    const q = String(req.query.q ?? "").trim();
    if (q.length < 2) {
      const err = new Error("Search query must be at least 2 characters");
      err.statusCode = 400;
      throw err;
    }
    if (q.length > 200) {
      const err = new Error("Search query is too long");
      err.statusCode = 400;
      throw err;
    }

    const lim = Math.min(Math.max(Number(req.query.limit) || 30, 1), 50);
    const rows = await repo.searchMessagesInChannel(channelId, q, { limit: lim });
    const chronological = [...rows].reverse();
    const attachmentRows = await repo.listAttachmentsForMessages(
      chronological.map((m) => m.id),
    );
    const attachmentsByMessage = groupAttachmentsByMessageId(attachmentRows);

    return res.json({
      query: q,
      messages: chronological.map((m) =>
        mapMessageRow(m, attachmentsByMessage.get(m.id) || []),
      ),
    });
  } catch (err) {
    return next(err);
  }
}

async function listMessages(req, res, next) {
  try {
    const channelId = String(req.params.channelId || "");
    if (!UUID_V4.test(channelId)) {
      const err = new Error("Invalid channel id");
      err.statusCode = 400;
      throw err;
    }

    const channel = await repo.findChannelById(channelId);
    if (!channel) {
      const err = new Error("Channel not found");
      err.statusCode = 404;
      throw err;
    }

    const before = req.query.before ? String(req.query.before).trim() : null;
    const lim = Math.min(Math.max(Number(req.query.limit) || 40, 1), 80);

    const rows = await repo.listMessagesForChannel(channelId, {
      before: before || null,
      limit: lim,
    });

    const chronological = [...rows].reverse();
    const oldest = chronological.length ? chronological[0].created_at : null;
    const hasMore = rows.length === lim;
    const attachmentRows = await repo.listAttachmentsForMessages(
      chronological.map((m) => m.id),
    );
    const attachmentsByMessage = groupAttachmentsByMessageId(attachmentRows);

    return res.json({
      channel: mapChannelRow(channel),
      messages: chronological.map((m) =>
        mapMessageRow(m, attachmentsByMessage.get(m.id) || []),
      ),
      pagination: {
        hasMore,
        oldestCreatedAt: oldest,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function createMessage(req, res, next) {
  try {
    const channelId = String(req.params.channelId || "");
    if (!UUID_V4.test(channelId)) {
      const err = new Error("Invalid channel id");
      err.statusCode = 400;
      throw err;
    }

    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > MAX_FILES_PER_MESSAGE) {
      unlinkFiles(files);
      const err = new Error(`At most ${MAX_FILES_PER_MESSAGE} files per message`);
      err.statusCode = 400;
      throw err;
    }

    let body = String(req.body?.body ?? "").trim();
    if (body.length > 8000) {
      unlinkFiles(files);
      const err = new Error("Message body must be at most 8000 characters");
      err.statusCode = 400;
      throw err;
    }
    if (!body && files.length === 0) {
      const err = new Error("Add a message or at least one file");
      err.statusCode = 400;
      throw err;
    }
    if (!body && files.length > 0) {
      body = "Shared files";
    }

    for (const file of files) {
      const check = validateUploadedFile(file);
      if (!check.ok) {
        unlinkFiles(files);
        const err = new Error(check.reason);
        err.statusCode = 400;
        throw err;
      }
    }

    const parentRaw = req.body?.parentMessageId;
    let parentMessageId = null;
    if (parentRaw != null && String(parentRaw).trim() !== "") {
      const pid = String(parentRaw).trim();
      if (!UUID_V4.test(pid)) {
        unlinkFiles(files);
        const err = new Error("Invalid parent message id");
        err.statusCode = 400;
        throw err;
      }
      parentMessageId = pid;
    }

    const channel = await repo.findChannelById(channelId);
    if (!channel) {
      unlinkFiles(files);
      const err = new Error("Channel not found");
      err.statusCode = 404;
      throw err;
    }

    if (parentMessageId) {
      const parent = await repo.findMessageById(parentMessageId);
      if (!parent) {
        unlinkFiles(files);
        const err = new Error("Parent message not found");
        err.statusCode = 404;
        throw err;
      }
      if (String(parent.channel_id) !== channelId) {
        unlinkFiles(files);
        const err = new Error("Parent message belongs to a different channel");
        err.statusCode = 400;
        throw err;
      }
      if (parent.parent_message_id) {
        unlinkFiles(files);
        const err = new Error("Replies are only one level deep; reply to the main post");
        err.statusCode = 400;
        throw err;
      }
    }

    const userId = req.user.id;
    const created = await repo.createMessage({
      channelId,
      userId,
      body,
      parentMessageId,
    });

    const attachmentPayload = [];
    for (const file of files) {
      const check = validateUploadedFile(file);
      attachmentPayload.push({
        messageId: created.id,
        kind: check.kind,
        filePath: file.path,
        originalName: file.originalname || "file",
        mimeType: file.mimetype,
        fileSize: file.size || 0,
      });
    }
    const attachmentRows =
      attachmentPayload.length > 0 ? await repo.createAttachments(attachmentPayload) : [];

    const result = await repo.findMessageWithAuthor(created.id);
    if (!result) {
      const err = new Error("Failed to load created message");
      err.statusCode = 500;
      throw err;
    }

    const mapped = mapMessageRow(result, attachmentRows.map(mapAttachmentRow));
    communityEvents.publish(channelId, {
      type: "message_created",
      payload: mapped,
    });
    return res.status(201).json(mapped);
  } catch (err) {
    unlinkFiles(Array.isArray(req.files) ? req.files : []);
    return next(err);
  }
}

async function streamChannel(req, res, next) {
  try {
    const channelId = String(req.params.channelId || "");
    if (!UUID_V4.test(channelId)) {
      const err = new Error("Invalid channel id");
      err.statusCode = 400;
      throw err;
    }

    const channel = await repo.findChannelById(channelId);
    if (!channel || channel.is_active === false) {
      const err = new Error("Channel not found");
      err.statusCode = 404;
      throw err;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (typeof res.flushHeaders === "function") res.flushHeaders();
    res.write(": connected\n\n");

    const unsubscribe = communityEvents.subscribe(channelId, (event) => {
      if (!event || !event.type) return;
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event.payload ?? null)}\n\n`);
    });

    const heartbeat = setInterval(() => {
      res.write(": ping\n\n");
    }, 25000);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  } catch (err) {
    return next(err);
  }
}

async function reportMessage(req, res, next) {
  try {
    const messageId = String(req.params.messageId || "");
    if (!UUID_V4.test(messageId)) {
      const err = new Error("Invalid message id");
      err.statusCode = 400;
      throw err;
    }
    const reason = String(req.body?.reason || "").trim();
    if (!reason) {
      const err = new Error("Report reason is required");
      err.statusCode = 400;
      throw err;
    }

    const message = await repo.findMessageById(messageId);
    if (!message) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }

    const created = await repo.reportMessage({
      messageId,
      reporterUserId: req.user.id,
      reason,
    });
    return res.status(201).json({
      id: created.id,
      messageId: created.message_id,
      reason: created.reason,
      status: created.status,
      createdAt: created.created_at,
    });
  } catch (err) {
    return next(err);
  }
}

async function updateMessage(req, res, next) {
  try {
    const messageId = String(req.params.messageId || "");
    if (!UUID_V4.test(messageId)) {
      const err = new Error("Invalid message id");
      err.statusCode = 400;
      throw err;
    }

    const body = String(req.body?.body ?? "").trim();
    if (body.length < 1 || body.length > 8000) {
      const err = new Error("Message body must be between 1 and 8000 characters");
      err.statusCode = 400;
      throw err;
    }

    const existing = await repo.findMessageById(messageId);
    if (!existing) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }

    const updated = await repo.updateMessageBodyIfOwner(messageId, req.user.id, body);
    if (!updated) {
      const err = new Error("Message not found or not allowed");
      err.statusCode = 404;
      throw err;
    }

    const result = await repo.findMessageWithAuthor(updated.id);
    if (!result) {
      const err = new Error("Failed to load updated message");
      err.statusCode = 500;
      throw err;
    }

    const attachmentRows = await repo.listAttachmentsForMessage(updated.id);
    const mapped = mapMessageRow(result, attachmentRows.map(mapAttachmentRow));

    communityEvents.publish(existing.channel_id, {
      type: "message_updated",
      payload: mapped,
    });

    return res.json(mapped);
  } catch (err) {
    return next(err);
  }
}

async function deleteMessage(req, res, next) {
  try {
    const messageId = String(req.params.messageId || "");
    if (!UUID_V4.test(messageId)) {
      const err = new Error("Invalid message id");
      err.statusCode = 400;
      throw err;
    }

    const existing = await repo.findMessageById(messageId);
    if (!existing) {
      const err = new Error("Message not found or not allowed");
      err.statusCode = 404;
      throw err;
    }

    const deleted = await repo.deleteMessageIfOwner(messageId, req.user.id);
    if (!deleted) {
      const err = new Error("Message not found or not allowed");
      err.statusCode = 404;
      throw err;
    }

    for (const filePath of deleted.file_paths || []) {
      const absolute = path.resolve(filePath);
      fs.unlink(absolute, () => {});
    }

    communityEvents.publish(deleted.channel_id || existing.channel_id, {
      type: "message_deleted",
      payload: { id: messageId, channelId: existing.channel_id },
    });

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function hideMessage(req, res, next) {
  try {
    if (!isModerator(req.user)) {
      return res.status(403).json({ message: "Moderator access required" });
    }

    const messageId = String(req.params.messageId || "");
    if (!UUID_V4.test(messageId)) {
      const err = new Error("Invalid message id");
      err.statusCode = 400;
      throw err;
    }

    const updated = await repo.hideMessageByOwner(messageId, req.user.id);
    if (!updated) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }

    communityEvents.publish(updated.channel_id, {
      type: "message_hidden",
      payload: { id: messageId, channelId: updated.channel_id },
    });

    return res.json({
      id: updated.id,
      channelId: updated.channel_id,
      isHidden: updated.is_hidden,
    });
  } catch (err) {
    return next(err);
  }
}

async function pinMessage(req, res, next) {
  try {
    if (!isModerator(req.user)) {
      return res.status(403).json({ message: "Moderator access required" });
    }

    const channelId = String(req.params.channelId || "");
    const messageId = String(req.params.messageId || "");
    if (!UUID_V4.test(channelId) || !UUID_V4.test(messageId)) {
      const err = new Error("Invalid channel or message id");
      err.statusCode = 400;
      throw err;
    }

    const channel = await repo.findChannelById(channelId);
    if (!channel || channel.is_active === false) {
      const err = new Error("Channel not found");
      err.statusCode = 404;
      throw err;
    }

    const message = await repo.findMessageById(messageId);
    if (!message || String(message.channel_id) !== channelId) {
      const err = new Error("Message not found in this channel");
      err.statusCode = 404;
      throw err;
    }
    if (message.parent_message_id) {
      const err = new Error("Only top-level messages can be pinned");
      err.statusCode = 400;
      throw err;
    }

    await repo.pinMessage({ channelId, messageId, userId: req.user.id });
    const refreshed = await repo.findChannelById(channelId);
    const pinnedMessage = mapPinnedMessage(refreshed);

    communityEvents.publish(channelId, {
      type: "pin_updated",
      payload: { channelId, pinnedMessage },
    });

    return res.json({ channelId, pinnedMessage });
  } catch (err) {
    return next(err);
  }
}

async function unpinMessage(req, res, next) {
  try {
    if (!isModerator(req.user)) {
      return res.status(403).json({ message: "Moderator access required" });
    }

    const channelId = String(req.params.channelId || "");
    if (!UUID_V4.test(channelId)) {
      const err = new Error("Invalid channel id");
      err.statusCode = 400;
      throw err;
    }

    const channel = await repo.findChannelById(channelId);
    if (!channel) {
      const err = new Error("Channel not found");
      err.statusCode = 404;
      throw err;
    }

    await repo.unpinMessage(channelId);

    communityEvents.publish(channelId, {
      type: "pin_updated",
      payload: { channelId, pinnedMessage: null },
    });

    return res.json({ channelId, pinnedMessage: null });
  } catch (err) {
    return next(err);
  }
}

function safeContentDispositionFilename(name) {
  const base = String(name || "file").replace(/["\r\n]/g, "_");
  return base.replace(/[^\x20-\x7E]/g, "_") || "file";
}

async function downloadAttachment(req, res, next) {
  try {
    const attachmentId = String(req.params.attachmentId || "");
    if (!UUID_V4.test(attachmentId)) {
      const err = new Error("Invalid attachment id");
      err.statusCode = 400;
      throw err;
    }

    const row = await repo.findAttachmentById(attachmentId);
    if (!row || row.is_hidden) {
      const err = new Error("Attachment not found");
      err.statusCode = 404;
      throw err;
    }

    const absolutePath = path.resolve(row.file_path);
    if (!fs.existsSync(absolutePath)) {
      const err = new Error("File is missing on server");
      err.statusCode = 404;
      throw err;
    }

    const forceDownload =
      req.query.download === "1" || req.query.download === "true";

    if (forceDownload) {
      return res.download(absolutePath, row.original_name);
    }

    const filename = safeContentDispositionFilename(row.original_name);
    res.setHeader("Content-Type", row.mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.sendFile(absolutePath);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listChannels,
  searchMessages,
  listMessages,
  createMessage,
  streamChannel,
  reportMessage,
  updateMessage,
  deleteMessage,
  hideMessage,
  pinMessage,
  unpinMessage,
  downloadAttachment,
};
