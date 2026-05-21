const crypto = require("crypto");
const { env } = require("../../../config/env");
const {
  chapaPost,
  isChapaConfigured,
  isPublicCallbackUrl,
  resolveChapaEmail,
  sanitizeChapaText,
  formatChapaAmount,
} = require("./chapaClient");
const { CheckoutSessionRepository } = require("../../../repositories/CheckoutSessionRepository");

const checkoutSessions = new CheckoutSessionRepository();

function splitName(fullName) {
  const parts = String(fullName || "Student User").trim().split(/\s+/);
  if (parts.length === 1) {
    return { first_name: parts[0].slice(0, 50), last_name: "User" };
  }
  return {
    first_name: parts[0].slice(0, 50),
    last_name: parts.slice(1).join(" ").slice(0, 50),
  };
}

/** Chapa tx_ref max length is 50 characters — keep it short and unique. */
function buildTxRef() {
  const suffix = `${Date.now().toString(36)}${crypto.randomBytes(2).toString("hex")}`;
  return `espro-${suffix}`.slice(0, 50);
}

async function createChapaPayment({ userId, email, fullName }) {
  if (!isChapaConfigured()) {
    const err = new Error("Chapa is not configured. Set CHAPA_SECRET_KEY.");
    err.statusCode = 503;
    throw err;
  }

  const txRef = buildTxRef();
  await checkoutSessions.create({
    userId,
    provider: "chapa",
    providerSessionId: txRef,
  });

  const { first_name, last_name } = splitName(fullName);
  const chapaEmail = resolveChapaEmail(email);
  const payload = {
    amount: formatChapaAmount(env.chapaProAmountEtb),
    currency: "ETB",
    first_name,
    last_name,
    tx_ref: txRef,
    return_url: env.chapaReturnUrl,
    customization: {
      title: sanitizeChapaText("EthioScholar Pro", "EthioScholar Pro", 50),
      description: sanitizeChapaText(
        "Unlimited AI chat for 30 days",
        "Unlimited AI chat for 30 days",
        100
      ),
    },
  };

  if (chapaEmail) {
    payload.email = chapaEmail;
  }

  if (isPublicCallbackUrl(env.chapaCallbackUrl)) {
    payload.callback_url = env.chapaCallbackUrl;
  }

  const response = await chapaPost("/transaction/initialize", payload);
  const checkoutUrl = response?.data?.checkout_url;

  if (String(response?.status).toLowerCase() !== "success" || !checkoutUrl) {
    const err = new Error(
      typeof response?.message === "string"
        ? response.message
        : "Chapa did not return a checkout URL"
    );
    err.statusCode = 502;
    throw err;
  }

  return { url: checkoutUrl, txRef };
}

module.exports = { createChapaPayment, buildTxRef };
