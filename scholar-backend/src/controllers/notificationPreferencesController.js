const {
  StudentNotificationPreferencesRepository,
} = require("../repositories/StudentNotificationPreferencesRepository");

const repo = new StudentNotificationPreferencesRepository();

function toResponse(row) {
  return {
    deadlineReminders: Boolean(row.deadline_reminders),
    applyFollowups: Boolean(row.apply_followups),
    emailUpdates: Boolean(row.email_updates),
    matchAlerts: Boolean(row.match_alerts),
    updatedAt: row.updated_at || null,
  };
}

async function getMine(req, res, next) {
  try {
    const row = await repo.getOrDefaults(req.user.id);
    return res.json(toResponse(row));
  } catch (err) {
    return next(err);
  }
}

async function updateMine(req, res, next) {
  try {
    const body = req.body || {};
    const updated = await repo.upsert(req.user.id, {
      deadlineReminders: body.deadlineReminders,
      applyFollowups: body.applyFollowups,
      emailUpdates: body.emailUpdates,
      matchAlerts: body.matchAlerts,
    });
    return res.json(toResponse(updated));
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getMine,
  updateMine,
};
