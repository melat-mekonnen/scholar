const { SubscriptionRepository } = require("../../repositories/SubscriptionRepository");
const { isProActive } = require("./isProActive");
const { getSubscriptionStatus } = require("./getSubscriptionStatus");
const { isStripeConfigured } = require("../../modules/billing/stripe/stripeClient");
const { getStripe } = require("../../modules/billing/stripe/stripeClient");

const subscriptionRepo = new SubscriptionRepository();

async function cancelStripeSubscriptionIfAny(row) {
  if (row.subscription_provider !== "stripe" || !row.subscription_external_id) {
    return { cancelled: false };
  }
  const subId = String(row.subscription_external_id);
  if (!subId.startsWith("sub_")) {
    return { cancelled: false };
  }
  if (!isStripeConfigured()) {
    return { cancelled: false, skipped: "stripe not configured" };
  }
  const stripe = getStripe();
  await stripe.subscriptions.cancel(subId);
  return { cancelled: true, subscriptionId: subId };
}

/**
 * End Pro for the current user (app access only). Stripe recurring subs are cancelled when linked.
 */
async function downgradeToFree(userId) {
  const row = await subscriptionRepo.getByUserId(userId);
  if (!row) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (!isProActive(row)) {
    const status = await getSubscriptionStatus(userId);
    return { downgraded: false, alreadyFree: true, ...status };
  }

  let stripeCancel = { cancelled: false };
  try {
    stripeCancel = await cancelStripeSubscriptionIfAny(row);
  } catch (err) {
    const wrapped = new Error(
      err.message || "Could not cancel Stripe subscription. Try again or contact support."
    );
    wrapped.statusCode = 502;
    throw wrapped;
  }

  await subscriptionRepo.setPlan(userId, {
    plan: "free",
    expiresAt: null,
    provider: null,
    externalId: null,
  });

  const status = await getSubscriptionStatus(userId);
  return {
    downgraded: true,
    alreadyFree: false,
    stripeSubscriptionCancelled: stripeCancel.cancelled,
    ...status,
  };
}

module.exports = { downgradeToFree };
