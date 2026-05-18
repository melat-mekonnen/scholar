const { verifyChapaTransactionAndActivate } = require("./verifyAndActivate");

/**
 * Chapa server callback (POST). Always re-verifies with Chapa API before activating Pro.
 */
async function handleChapaWebhook(body) {
  const txRef =
    body?.tx_ref ||
    body?.trx_ref ||
    body?.data?.tx_ref ||
    body?.data?.trx_ref ||
    body?.reference;

  if (!txRef) {
    return { handled: false, reason: "missing tx_ref" };
  }

  const result = await verifyChapaTransactionAndActivate(String(txRef));
  return { handled: true, txRef: String(txRef), ...result };
}

module.exports = { handleChapaWebhook };
