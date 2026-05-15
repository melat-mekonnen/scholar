const { env } = require("../../../config/env");

let stripeSingleton = null;

function isStripeConfigured() {
  return Boolean(env.stripeSecretKey && env.stripePriceIdProMonthly);
}

function getStripe() {
  if (!env.stripeSecretKey) {
    const err = new Error("Stripe is not configured on the server");
    err.statusCode = 503;
    throw err;
  }
  if (!stripeSingleton) {
    // eslint-disable-next-line global-require
    const Stripe = require("stripe");
    stripeSingleton = new Stripe(env.stripeSecretKey);
  }
  return stripeSingleton;
}

module.exports = { getStripe, isStripeConfigured };
