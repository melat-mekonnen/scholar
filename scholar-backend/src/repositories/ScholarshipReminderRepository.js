const { query } = require("../infra/db/neonClient");

class ScholarshipReminderRepository {
  /**
   * Bookmarks due for a deadline reminder N days before deadline.
   * Skips if application is submitted/accepted/rejected.
   */
  async listDueForReminder(daysBefore) {
    const result = await query(
      `SELECT b.user_id,
              b.scholarship_id,
              u.email AS user_email,
              u.full_name AS user_full_name,
              s.title AS scholarship_title,
              s.deadline AS scholarship_deadline,
              s.application_url
       FROM bookmarks b
       INNER JOIN scholarships s ON s.id = b.scholarship_id
       INNER JOIN users u ON u.id = b.user_id
       LEFT JOIN applications a
         ON a.user_id = b.user_id AND a.scholarship_id = b.scholarship_id
       LEFT JOIN student_notification_preferences p ON p.user_id = b.user_id
       WHERE s.status = 'verified'
         AND s.deadline IS NOT NULL
         AND s.deadline = CURRENT_DATE + $1::int
         AND (p.deadline_reminders IS NULL OR p.deadline_reminders = TRUE)
         AND (
           a.id IS NULL
           OR a.status = 'pending'
         )
         AND NOT EXISTS (
           SELECT 1
           FROM scholarship_reminder_sent r
           WHERE r.user_id = b.user_id
             AND r.scholarship_id = b.scholarship_id
             AND r.days_before = $1
         )
       ORDER BY b.user_id`,
      [daysBefore],
    );
    return result.rows;
  }

  async markSent({ userId, scholarshipId, daysBefore }) {
    await query(
      `INSERT INTO scholarship_reminder_sent (user_id, scholarship_id, days_before)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, scholarship_id, days_before) DO NOTHING`,
      [userId, scholarshipId, daysBefore],
    );
  }
}

module.exports = { ScholarshipReminderRepository };
