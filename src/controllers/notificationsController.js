const { ScholarshipModerationRepository } = require("../repositories/ScholarshipModerationRepository");

const repo = new ScholarshipModerationRepository();

async function listMine(req, res, next) {
  try {
    const rows = await repo.listNotificationsByUser(req.user.id, {
      limit: req.query?.limit ? Math.min(Math.max(parseInt(req.query.limit, 10), 1), 100) : 30,
      onlyUnread: String(req.query?.unread || "").toLowerCase() === "true",
    });
    return res.json({
      notifications: rows.map((r) => ({
        id: r.id,
        scholarshipId: r.scholarship_id,
        type: r.type,
        message: r.message,
        isRead: Boolean(r.is_read),
        createdAt: r.created_at,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

async function markMineRead(req, res, next) {
  try {
    await repo.markAllRead(req.user.id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listMine,
  markMineRead,
};
