const { SubscriptionRepository } = require("../../repositories/SubscriptionRepository");
const { SubscriptionPaymentRepository } = require("../../repositories/SubscriptionPaymentRepository");

const subscriptionRepo = new SubscriptionRepository();
const paymentRepo = new SubscriptionPaymentRepository();

/**
 * Grant Pro after a verified payment (idempotent via provider_payment_id).
 */
async function activatePro({
  userId,
  provider,
  externalId,
  periodEnd = null,
  payment = null,
}) {
  if (!userId) {
    const err = new Error("userId is required");
    err.statusCode = 400;
    throw err;
  }

  const row = await subscriptionRepo.setPlan(userId, {
    plan: "pro",
    expiresAt: periodEnd,
    provider,
    externalId,
  });

  if (!row) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  let paymentInserted = false;
  if (payment?.providerPaymentId) {
    const { inserted } = await paymentRepo.recordPayment({
      userId,
      provider: payment.provider || provider,
      providerPaymentId: payment.providerPaymentId,
      amountCents: payment.amountCents ?? null,
      currency: payment.currency ?? null,
      status: payment.status || "succeeded",
      periodStart: payment.periodStart ?? null,
      periodEnd: periodEnd,
      metadata: payment.metadata ?? {},
    });
    paymentInserted = inserted;
  }

  return {
    user: row,
    paymentInserted,
    plan: "pro",
    expiresAt: periodEnd,
  };
}

module.exports = { activatePro };
