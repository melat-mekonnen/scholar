const { env } = require("../../../config/env");
const { getStripe } = require("./stripeClient");
const { activatePro } = require("../../../usecases/subscription/activatePro");
const { SubscriptionRepository } = require("../../../repositories/SubscriptionRepository");

const subscriptionRepo = new SubscriptionRepository();

function periodEndFromUnix(seconds) {
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

async function resolveUserIdFromSession(session) {
  const fromMeta = session.metadata?.userId || session.client_reference_id;
  return fromMeta ? String(fromMeta) : null;
}

async function handleCheckoutSessionCompleted(session) {
  const userId = await resolveUserIdFromSession(session);
  if (!userId) {
    return { handled: false, reason: "missing userId on session" };
  }

  const stripe = getStripe();
  let periodEnd = null;
  let externalId = session.subscription ? String(session.subscription) : session.id;

  if (session.subscription) {
    const sub = await stripe.subscriptions.retrieve(String(session.subscription));
    periodEnd = periodEndFromUnix(sub.current_period_end);
    externalId = sub.id;
  }

  const amountCents = session.amount_total != null ? Number(session.amount_total) : null;

  await activatePro({
    userId,
    provider: "stripe",
    externalId,
    periodEnd,
    payment: {
      providerPaymentId: session.id,
      amountCents,
      currency: (session.currency || "usd").toUpperCase(),
      status: "succeeded",
      metadata: { type: "checkout.session.completed", subscriptionId: session.subscription },
    },
  });

  return { handled: true, userId, periodEnd };
}

async function handleSubscriptionDeleted(subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    return { handled: false, reason: "missing userId on subscription" };
  }

  await subscriptionRepo.setPlan(userId, {
    plan: "free",
    expiresAt: null,
    provider: null,
    externalId: null,
  });

  return { handled: true, userId, action: "downgraded" };
}

async function handleStripeWebhook(rawBody, signature) {
  if (!env.stripeWebhookSecret) {
    const err = new Error("Stripe webhook secret is not configured");
    err.statusCode = 503;
    throw err;
  }

  const stripe = getStripe();
  const event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);

  switch (event.type) {
    case "checkout.session.completed":
      return { eventType: event.type, ...(await handleCheckoutSessionCompleted(event.data.object)) };
    case "customer.subscription.deleted":
      return { eventType: event.type, ...(await handleSubscriptionDeleted(event.data.object)) };
    default:
      return { eventType: event.type, handled: false, reason: "ignored" };
  }
}

module.exports = { handleStripeWebhook };
