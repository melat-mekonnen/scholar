const nodemailer = require("nodemailer");
const { env } = require("../../config/env");

function buildTransporter() {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass || !env.smtpFrom) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpPort === 465,
    family: 4,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });
}

async function sendPasswordResetEmail({ to, resetUrl }) {
  const transporter = buildTransporter();
  if (!transporter) return false;

  await transporter.sendMail({
    from: env.smtpFrom,
    to,
    subject: "Scholar Portal password reset",
    text: `Use this link to reset your password: ${resetUrl}`,
    html: `<p>Use this link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
  return true;
}

async function sendDeadlineReminderEmail({
  to,
  studentName,
  scholarshipTitle,
  deadline,
  daysBefore,
  savedUrl,
  applyUrl,
}) {
  const transporter = buildTransporter();
  const name = studentName || "there";
  const deadlineStr =
    deadline instanceof Date
      ? deadline.toISOString().slice(0, 10)
      : String(deadline || "").slice(0, 10);
  const subject = `Reminder: ${scholarshipTitle} deadline in ${daysBefore} day${daysBefore === 1 ? "" : "s"}`;
  const text = `Hi ${name},

You saved "${scholarshipTitle}" on EthioScholar. The application deadline is ${deadlineStr} (${daysBefore} day${daysBefore === 1 ? "" : "s"} from today).

View saved scholarships: ${savedUrl}
Apply: ${applyUrl}

You can turn off deadline reminders in Settings.`;

  const html = `<p>Hi ${name},</p>
<p>You saved <strong>${scholarshipTitle}</strong>. The deadline is <strong>${deadlineStr}</strong> (${daysBefore} day${daysBefore === 1 ? "" : "s"} from today).</p>
<p><a href="${savedUrl}">View saved scholarships</a> · <a href="${applyUrl}">Open application</a></p>
<p><small>Manage notification preferences in Settings.</small></p>`;

  if (!transporter) return false;
  await transporter.sendMail({ from: env.smtpFrom, to, subject, text, html });
  return true;
}

async function sendApplicationFollowUpEmail({
  to,
  studentName,
  scholarshipTitle,
  confirmUrl,
  applicationsUrl,
}) {
  const transporter = buildTransporter();
  const name = studentName || "there";
  const subject = `Did you apply to ${scholarshipTitle}?`;
  const text = `Hi ${name},

You started an application for "${scholarshipTitle}" on EthioScholar.

If you submitted it on the official site, confirm here:
${confirmUrl}

View your application tracker: ${applicationsUrl}`;

  const html = `<p>Hi ${name},</p>
<p>Did you finish applying to <strong>${scholarshipTitle}</strong> on the official site?</p>
<p><a href="${confirmUrl}"><strong>Yes, I applied</strong></a></p>
<p><a href="${applicationsUrl}">Open application tracker</a></p>`;

  if (!transporter) return false;
  await transporter.sendMail({ from: env.smtpFrom, to, subject, text, html });
  return true;
}

module.exports = {
  sendPasswordResetEmail,
  sendDeadlineReminderEmail,
  sendApplicationFollowUpEmail,
};
