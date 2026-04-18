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

module.exports = {
  sendPasswordResetEmail,
};
