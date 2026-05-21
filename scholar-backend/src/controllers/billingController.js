const { isStripeConfigured } = require("../modules/billing/stripe/stripeClient");
const { createStripeCheckoutSession } = require("../modules/billing/stripe/createCheckoutSession");
const { handleStripeWebhook } = require("../modules/billing/stripe/handleWebhook");
const { isChapaConfigured } = require("../modules/billing/chapa/chapaClient");
const { createChapaPayment } = require("../modules/billing/chapa/createPayment");
const { handleChapaWebhook } = require("../modules/billing/chapa/handleWebhook");
const { verifyChapaTransactionAndActivate } = require("../modules/billing/chapa/verifyAndActivate");
const { getSubscriptionStatus } = require("../usecases/subscription/getSubscriptionStatus");
const { downgradeToFree } = require("../usecases/subscription/downgradeToFree");
const { UserRepository } = require("../repositories/UserRepository");

const userRepo = new UserRepository();

async function getSubscription(req, res, next) {
  try {
    const data = await getSubscriptionStatus(req.user.id);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

async function stripeCheckout(req, res, next) {
  try {
    if (!isStripeConfigured()) {
      const err = new Error(
        "Stripe billing is not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_PRO_MONTHLY."
      );
      err.statusCode = 503;
      throw err;
    }

    const user = await userRepo.findById(req.user.id);
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    const session = await createStripeCheckoutSession({
      userId: req.user.id,
      email: user.email,
    });

    return res.json(session);
  } catch (err) {
    return next(err);
  }
}

async function chapaCheckout(req, res, next) {
  try {
    if (!isChapaConfigured()) {
      const err = new Error("Chapa is not configured. Set CHAPA_SECRET_KEY.");
      err.statusCode = 503;
      throw err;
    }

    const user = await userRepo.findById(req.user.id);
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    const session = await createChapaPayment({
      userId: req.user.id,
      email: user.email,
      fullName: user.full_name,
    });

    return res.json(session);
  } catch (err) {
    return next(err);
  }
}

async function cancelSubscription(req, res, next) {
  try {
    const result = await downgradeToFree(req.user.id);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function chapaConfirm(req, res, next) {
  try {
    const txRef = req.body?.txRef || req.body?.tx_ref;
    const result = await verifyChapaTransactionAndActivate(txRef);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
}

async function chapaWebhook(req, res, next) {
  try {
    const result = await handleChapaWebhook(req.body || {});
    return res.json({ received: true, ...result });
  } catch (err) {
    return next(err);
  }
}

async function stripeWebhook(req, res, next) {
  try {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      const err = new Error("Missing Stripe-Signature header");
      err.statusCode = 400;
      throw err;
    }

    const result = await handleStripeWebhook(req.body, signature);
    return res.json({ received: true, ...result });
  } catch (err) {
    if (err.type === "StripeSignatureVerificationError") {
      err.statusCode = 400;
      err.message = "Invalid Stripe webhook signature";
    }
    return next(err);
  }
}

module.exports = {
  getSubscription,
  cancelSubscription,
  stripeCheckout,
  chapaCheckout,
  chapaConfirm,
  chapaWebhook,
  stripeWebhook,
};
