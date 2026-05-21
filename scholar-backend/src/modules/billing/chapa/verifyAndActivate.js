const { env } = require("../../../config/env");
const { chapaGet, isChapaConfigured } = require("./chapaClient");
const { activatePro } = require("../../../usecases/subscription/activatePro");
const { CheckoutSessionRepository } = require("../../../repositories/CheckoutSessionRepository");

const checkoutSessions = new CheckoutSessionRepository();

function proPeriodEnd(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

async function resolveUserId(txRef) {
  const fromDb = await checkoutSessions.findUserIdByProviderSession("chapa", txRef);
  if (fromDb) return String(fromDb);
  return null;
}

/**
 * Verify a Chapa transaction and grant Pro (idempotent payment row).
 */
async function verifyChapaTransactionAndActivate(txRef) {
  if (!isChapaConfigured()) {
    const err = new Error("Chapa is not configured (CHAPA_SECRET_KEY)");
    err.statusCode = 503;
    throw err;
  }
  if (!txRef) {
    const err = new Error("tx_ref is required");
    err.statusCode = 400;
    throw err;
  }

  const userId = await resolveUserId(txRef);
  if (!userId) {
    const err = new Error("Unknown or expired Chapa transaction reference");
    err.statusCode = 400;
    throw err;
  }

  const verify = await chapaGet(`/transaction/verify/${encodeURIComponent(txRef)}`);
  const status = String(verify?.status || verify?.data?.status || "").toLowerCase();
  const data = verify?.data || verify;

  if (status !== "success" && data?.status !== "success") {
    return { activated: false, reason: "payment not successful", verify };
  }

  const amount = data?.amount != null ? Number(data.amount) : null;
  const amountCents = amount != null ? Math.round(amount * 100) : null;

  const result = await activatePro({
    userId,
    provider: "chapa",
    externalId: String(data?.reference || txRef),
    periodEnd: proPeriodEnd(env.chapaProDays),
    payment: {
      providerPaymentId: txRef,
      amountCents,
      currency: String(data?.currency || "ETB").toUpperCase(),
      status: "succeeded",
      metadata: { verify: data },
    },
  });

  await checkoutSessions.markCompleted("chapa", txRef);

  return { activated: true, userId, paymentInserted: result.paymentInserted, verify };
}

module.exports = { verifyChapaTransactionAndActivate };
