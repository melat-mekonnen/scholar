const { env } = require("../config/env");
const { generateToken, hashToken } = require("../utils/tokenHash");
const { ApplicationRepository } = require("../repositories/ApplicationRepository");
const { ApplicationConfirmTokenRepository } = require("../repositories/ApplicationConfirmTokenRepository");
const { ScholarshipReminderRepository } = require("../repositories/ScholarshipReminderRepository");
const {
  sendDeadlineReminderEmail,
  sendApplicationFollowUpEmail,
} = require("../infra/email/mailer");

const applicationRepo = new ApplicationRepository();
const confirmTokenRepo = new ApplicationConfirmTokenRepository();
const reminderRepo = new ScholarshipReminderRepository();

const REMINDER_DAYS = [7, 3, 1];
const TOKEN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function confirmUrl(token) {
  return `${env.frontendAppUrl}/applications/confirm?token=${encodeURIComponent(token)}`;
}

async function issueConfirmToken(applicationId, userId) {
  const raw = generateToken();
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await confirmTokenRepo.create({
    applicationId,
    userId,
    tokenHash,
    expiresAt,
  });
  return raw;
}

async function confirmApplicationByToken(rawToken) {
  const row = await confirmTokenRepo.findValidByTokenHash(hashToken(rawToken));
  if (!row) {
    const err = new Error("Invalid or expired confirmation link");
    err.statusCode = 400;
    throw err;
  }

  if (row.application_status === "submitted") {
    await confirmTokenRepo.markUsed(row.token_id);
    return {
      alreadySubmitted: true,
      scholarshipTitle: row.scholarship_title,
    };
  }

  const updated = await applicationRepo.updateStatus(
    row.application_id,
    row.user_id,
    "submitted",
  );
  if (!updated) {
    const err = new Error("Application not found");
    err.statusCode = 404;
    throw err;
  }

  await confirmTokenRepo.markUsed(row.token_id);
  return {
    alreadySubmitted: false,
    scholarshipTitle: row.scholarship_title,
    applicationId: updated.id,
  };
}

async function runDeadlineReminderSweep() {
  let sent = 0;
  for (const daysBefore of REMINDER_DAYS) {
    const rows = await reminderRepo.listDueForReminder(daysBefore);
    for (const row of rows) {
      const ok = await sendDeadlineReminderEmail({
        to: row.user_email,
        studentName: row.user_full_name,
        scholarshipTitle: row.scholarship_title,
        deadline: row.scholarship_deadline,
        daysBefore,
        savedUrl: `${env.frontendAppUrl}/saved`,
        applyUrl: row.application_url || `${env.frontendAppUrl}/scholarships`,
      });
      await reminderRepo.markSent({
        userId: row.user_id,
        scholarshipId: row.scholarship_id,
        daysBefore,
      });
      if (ok) sent += 1;
      else if (env.nodeEnv !== "production") {
        // eslint-disable-next-line no-console
        console.log(
          `[notifications] deadline reminder (${daysBefore}d) for ${row.user_email}: ${row.scholarship_title}`,
        );
      }
    }
  }
  return sent;
}

/** Only pending applications that are also bookmarked (saved + apply). */
async function runApplicationFollowUpSweep() {
  const minAgeMinutes = Math.max(
    1,
    parseInt(process.env.APPLY_FOLLOWUP_MIN_AGE_MINUTES || "60", 10) || 60,
  );
  const rows = await applicationRepo.listPendingForFollowUp(minAgeMinutes);
  let sent = 0;

  for (const row of rows) {
    const token = await issueConfirmToken(row.id, row.user_id);
    const url = confirmUrl(token);
    const ok = await sendApplicationFollowUpEmail({
      to: row.user_email,
      studentName: row.user_full_name,
      scholarshipTitle: row.scholarship_title,
      confirmUrl: url,
      applicationsUrl: `${env.frontendAppUrl}/applications`,
    });
    await applicationRepo.markFollowUpSent(row.id);
    if (ok) sent += 1;
    else if (env.nodeEnv !== "production") {
      // eslint-disable-next-line no-console
      console.log(
        `[notifications] apply follow-up for ${row.user_email}: ${row.scholarship_title} → ${url}`,
      );
    }
  }
  return sent;
}

module.exports = {
  issueConfirmToken,
  confirmApplicationByToken,
  runDeadlineReminderSweep,
  runApplicationFollowUpSweep,
  REMINDER_DAYS,
};
