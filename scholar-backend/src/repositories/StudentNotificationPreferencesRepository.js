const { query } = require("../infra/db/neonClient");

const DEFAULTS = {
  deadline_reminders: true,
  apply_followups: true,
  email_updates: true,
  match_alerts: true,
};

class StudentNotificationPreferencesRepository {
  async getByUserId(userId) {
    const result = await query(
      `SELECT user_id, deadline_reminders, apply_followups, email_updates, match_alerts, updated_at
       FROM student_notification_preferences
       WHERE user_id = $1`,
      [userId],
    );
    return result.rows[0] || null;
  }

  async getOrDefaults(userId) {
    const row = await this.getByUserId(userId);
    if (!row) return { user_id: userId, ...DEFAULTS };
    return row;
  }

  async upsert(userId, prefs) {
    const result = await query(
      `INSERT INTO student_notification_preferences (
         user_id, deadline_reminders, apply_followups, email_updates, match_alerts, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         deadline_reminders = EXCLUDED.deadline_reminders,
         apply_followups = EXCLUDED.apply_followups,
         email_updates = EXCLUDED.email_updates,
         match_alerts = EXCLUDED.match_alerts,
         updated_at = NOW()
       RETURNING user_id, deadline_reminders, apply_followups, email_updates, match_alerts, updated_at`,
      [
        userId,
        prefs.deadlineReminders ?? DEFAULTS.deadline_reminders,
        prefs.applyFollowups ?? DEFAULTS.apply_followups,
        prefs.emailUpdates ?? DEFAULTS.email_updates,
        prefs.matchAlerts ?? DEFAULTS.match_alerts,
      ],
    );
    return result.rows[0];
  }
}

module.exports = { StudentNotificationPreferencesRepository };
