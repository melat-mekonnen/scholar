const { ScholarshipModerationRepository } = require("../repositories/ScholarshipModerationRepository");

const moderationRepo = new ScholarshipModerationRepository();

async function notifyScholarshipDecision({ scholarshipId, ownerUserId, action, reason }) {
  if (!ownerUserId) return;
  const suffix = reason ? ` Reason: ${reason}` : "";
  const message =
    action === "verified"
      ? `Your scholarship was approved and is now live.${suffix}`
      : `Your scholarship was rejected and needs revision.${suffix}`;
  await moderationRepo.createNotification({
    userId: ownerUserId,
    scholarshipId,
    type: action === "verified" ? "scholarship_verified" : "scholarship_rejected",
    message,
  });
}

module.exports = {
  notifyScholarshipDecision,
};
