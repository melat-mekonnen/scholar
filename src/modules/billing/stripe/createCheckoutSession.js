const { env } = require("../../../config/env");
const { getStripe } = require("./stripeClient");

async function createStripeCheckoutSession({ userId, email }) {
  const stripe = getStripe();
  const priceId = env.stripePriceIdProMonthly;
  if (!priceId) {
    const err = new Error("Stripe price is not configured (STRIPE_PRICE_ID_PRO_MONTHLY)");
    err.statusCode = 503;
    throw err;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: email || undefined,
    client_reference_id: String(userId),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: env.stripeSuccessUrl,
    cancel_url: env.stripeCancelUrl,
    metadata: {
      userId: String(userId),
    },
    subscription_data: {
      metadata: {
        userId: String(userId),
      },
    },
  });

  if (!session.url) {
    const err = new Error("Stripe did not return a checkout URL");
    err.statusCode = 502;
    throw err;
  }

  return {
    sessionId: session.id,
    url: session.url,
  };
}

module.exports = { createStripeCheckoutSession };
