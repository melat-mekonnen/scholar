const { CommunityRepository } = require("../repositories/CommunityRepository");

const repo = new CommunityRepository();
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function listChannels(req, res, next) {
  try {
    const rows = await repo.listChannels({ includeInactive: true });
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

async function createChannel(req, res, next) {
  try {
    const name = String(req.body?.name || "").trim();
    const slug = normalizeSlug(req.body?.slug || name);
    const description = String(req.body?.description || "").trim();
    const sortOrder = Number.isFinite(Number(req.body?.sortOrder)) ? Number(req.body.sortOrder) : 0;
    if (!name || !slug) {
      const err = new Error("Channel name and slug are required");
      err.statusCode = 400;
      throw err;
    }
    const created = await repo.createChannel({
      slug,
      name,
      description: description || null,
      sortOrder,
      isActive: true,
    });
    return res.status(201).json({
      id: created.id,
      slug: created.slug,
      name: created.name,
      description: created.description,
      sortOrder: created.sort_order,
      isActive: Boolean(created.is_active),
      createdAt: created.created_at,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Channel slug already exists" });
    }
    return next(err);
  }
}

async function updateChannel(req, res, next) {
  try {
    const id = String(req.params?.id || "");
    if (!UUID_V4.test(id)) {
      const err = new Error("Invalid channel id");
      err.statusCode = 400;
      throw err;
    }
    const patch = {};
    if (req.body?.name != null) patch.name = String(req.body.name).trim();
    if (req.body?.slug != null) patch.slug = normalizeSlug(req.body.slug);
    if (req.body?.description != null) patch.description = String(req.body.description).trim();
    if (req.body?.sortOrder != null) patch.sortOrder = Number(req.body.sortOrder);
    if (req.body?.isActive != null) patch.isActive = Boolean(req.body.isActive);
    const updated = await repo.updateChannel(id, patch);
    if (!updated) {
      const err = new Error("Channel not found");
      err.statusCode = 404;
      throw err;
    }
    return res.json({
      id: updated.id,
      slug: updated.slug,
      name: updated.name,
      description: updated.description,
      sortOrder: updated.sort_order,
      isActive: Boolean(updated.is_active),
      createdAt: updated.created_at,
    });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ message: "Channel slug already exists" });
    }
    return next(err);
  }
}

async function listReports(req, res, next) {
  try {
    const status = req.query?.status ? String(req.query.status) : "open";
    const limit = Math.min(Math.max(parseInt(req.query?.limit || "50", 10), 1), 200);
    const rows = await repo.listReports({ status, limit });
    return res.json({
      reports: rows.map((r) => ({
        id: r.id,
        messageId: r.message_id,
        reporterUserId: r.reporter_user_id,
        reason: r.reason,
        status: r.status,
        createdAt: r.created_at,
        channelId: r.channel_id,
        messageBody: r.message_body,
        messageAuthorId: r.message_author_id,
        reporterName: r.reporter_full_name,
        messageAuthorName: r.author_full_name,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

async function resolveReport(req, res, next) {
  try {
    const id = String(req.params?.id || "");
    if (!UUID_V4.test(id)) {
      const err = new Error("Invalid report id");
      err.statusCode = 400;
      throw err;
    }
    const status = String(req.body?.status || "resolved");
    if (!["resolved", "dismissed"].includes(status)) {
      const err = new Error("Status must be resolved or dismissed");
      err.statusCode = 400;
      throw err;
    }
    const updated = await repo.resolveReport(id, req.user.id, status);
    if (!updated) {
      const err = new Error("Report not found");
      err.statusCode = 404;
      throw err;
    }
    return res.json({
      id: updated.id,
      status: updated.status,
      reviewedByUserId: updated.reviewed_by_user_id,
      reviewedAt: updated.reviewed_at,
    });
  } catch (err) {
    return next(err);
  }
}

async function hideMessage(req, res, next) {
  try {
    const id = String(req.params?.messageId || "");
    if (!UUID_V4.test(id)) {
      const err = new Error("Invalid message id");
      err.statusCode = 400;
      throw err;
    }
    const updated = await repo.hideMessageByOwner(id, req.user.id);
    if (!updated) {
      const err = new Error("Message not found");
      err.statusCode = 404;
      throw err;
    }
    return res.json({
      id: updated.id,
      channelId: updated.channel_id,
      isHidden: updated.is_hidden,
      hiddenByUserId: updated.hidden_by_user_id,
      hiddenAt: updated.hidden_at,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listChannels,
  createChannel,
  updateChannel,
  listReports,
  resolveReport,
  hideMessage,
};
