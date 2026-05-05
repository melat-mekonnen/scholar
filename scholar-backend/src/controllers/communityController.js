const { CommunityRepository } = require("../repositories/CommunityRepository");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");
const { subscribe, publish } = require("../services/communityEvents");

const repo = new CommunityRepository();

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function mapMessageRow(row) {
  return {
    id: row.id,
    channelId: row.channel_id,
    userId: row.user_id,
    parentMessageId: row.parent_message_id,
    body: row.body,
    createdAt: row.created_at,
    authorFullName: row.author_full_name,
    isHidden: Boolean(row.is_hidden),
  };
}

function canAccessCommunityRole(role) {
  return role === "student" || role === "owner" || role === "admin";
}

async function listChannels(req, res, next) {
  try {
    if (!canAccessCommunityRole(req.user?.role)) {
      return res.status(403).json({ message: "Community access is only for students, owners, or admins" });
    }
    const rows = await repo.listChannels({ includeInactive: req.user?.role === "owner" || req.user?.role === "admin" });
    return res.json({
      channels: rows.map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        description: c.description,
        sortOrder: c.sort_order,
        isActive: Boolean(c.is_active),
        createdAt: c.created_at,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

async function listMessages(req, res, next) {
  try {
    if (!canAccessCommunityRole(req.user?.role)) {
      return res.status(403).json({ message: "Community access is only for students, owners, or admins" });
    }
    const channelId = String(req.params.channelId || "");
    if (!UUID_V4.test(channelId)) {
      const err = new Error("Invalid channel id");
      err.statusCode = 400;
      throw err;
    }

    const channel = await repo.findChannelById(channelId);
    if (!channel || !channel.is_active) {
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

    return res.json({
      channel: {
        id: channel.id,
        slug: channel.slug,
        name: channel.name,
        description: channel.description,
      },
      messages: chronological.map(mapMessageRow),
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
    if (!canAccessCommunityRole(req.user?.role)) {
      return res.status(403).json({ message: "Community access is only for students, owners, or admins" });
    }
    const channelId = String(req.params.channelId || "");
    if (!UUID_V4.test(channelId)) {
      const err = new Error("Invalid channel id");
      err.statusCode = 400;
      throw err;
    }

    const body = String(req.body?.body ?? "").trim();
    if (body.length < 1 || body.length > 8000) {
      const err = new Error("Message body must be between 1 and 8000 characters");
      err.statusCode = 400;
      throw err;
    }

    const parentRaw = req.body?.parentMessageId;
    let parentMessageId = null;
    if (parentRaw != null && String(parentRaw).trim() !== "") {
      const pid = String(parentRaw).trim();
      if (!UUID_V4.test(pid)) {
        const err = new Error("Invalid parent message id");
        err.statusCode = 400;
        throw err;
      }
      parentMessageId = pid;
    }

    const channel = await repo.findChannelById(channelId);
    if (!channel || !channel.is_active) {
      const err = new Error("Channel not found");
      err.statusCode = 404;
      throw err;
    }

    if (parentMessageId) {
      const parent = await repo.findMessageById(parentMessageId);
      if (!parent) {
        const err = new Error("Parent message not found");
        err.statusCode = 404;
        throw err;
      }
      if (String(parent.channel_id) !== channelId) {
        const err = new Error("Parent message belongs to a different channel");
        err.statusCode = 400;
        throw err;
      }
      if (parent.parent_message_id) {
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

    const result = await repo.findMessageWithAuthor(created.id);
    if (!result) {
      const err = new Error("Failed to load created message");
      err.statusCode = 500;
      throw err;
    }

    const payload = mapMessageRow(result);
    publish(channelId, { type: "message_created", message: payload });
    return res.status(201).json(payload);
  } catch (err) {
    return next(err);
  }
}

async function deleteMessage(req, res, next) {
  try {
    if (!canAccessCommunityRole(req.user?.role)) {
      return res.status(403).json({ message: "Community access is only for students, owners, or admins" });
    }
    const messageId = String(req.params.messageId || "");
    if (!UUID_V4.test(messageId)) {
      const err = new Error("Invalid message id");
      err.statusCode = 400;
      throw err;
    }

    const deleted = await repo.deleteMessageIfOwner(messageId, req.user.id);
    if (!deleted) {
      const err = new Error("Message not found or not allowed");
      err.statusCode = 404;
      throw err;
    }

    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function reportMessage(req, res, next) {
  try {
    if (req.user?.role !== "student") {
      return res.status(403).json({ message: "Student access required" });
    }
    const messageId = String(req.params.messageId || "");
    const reason = String(req.body?.reason || "").trim();
    if (!UUID_V4.test(messageId)) {
      const err = new Error("Invalid message id");
      err.statusCode = 400;
      throw err;
    }
    if (!reason) {
      const err = new Error("Reason is required");
      err.statusCode = 400;
      throw err;
    }
    const msg = await repo.findMessageById(messageId);
    if (!msg || msg.is_hidden) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }
    const created = await repo.createReport({
      messageId,
      reporterUserId: req.user.id,
      reason,
    });
    return res.status(201).json({
      id: created.id,
      messageId: created.message_id,
      reporterUserId: created.reporter_user_id,
      reason: created.reason,
      status: created.status,
      createdAt: created.created_at,
    });
  } catch (err) {
    return next(err);
  }
}

function streamChannel(req, res) {
  const channelId = String(req.params.channelId || "");
  const token = String(req.query?.token || "");
  if (!UUID_V4.test(channelId) || !token) {
    return res.status(400).json({ message: "Invalid stream request" });
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    return res.status(401).json({ message: "Invalid stream token" });
  }
  if (!canAccessCommunityRole(payload.role)) {
    return res.status(403).json({ message: "Community access denied" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  res.write(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  const unsubscribe = subscribe(channelId, (event) => {
    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.message)}\n\n`);
  });

  const keepAlive = setInterval(() => {
    res.write(`event: ping\ndata: {}\n\n`);
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
}

module.exports = {
  listChannels,
  listMessages,
  createMessage,
  deleteMessage,
  reportMessage,
  streamChannel,
};
