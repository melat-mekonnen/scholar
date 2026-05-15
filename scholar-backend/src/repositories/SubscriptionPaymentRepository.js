const { query } = require("../infra/db/neonClient");

class SubscriptionPaymentRepository {
  /**
   * @returns {{ inserted: boolean, row: object | null }}
   */
  async recordPayment({
    userId,
    provider,
    providerPaymentId,
    amountCents,
    currency,
    status,
    plan = "pro",
    periodStart = null,
    periodEnd = null,
    metadata = {},
  }) {
    const result = await query(
      `INSERT INTO subscription_payments (
         user_id, provider, provider_payment_id, amount_cents, currency,
         status, plan, period_start, period_end, metadata
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       ON CONFLICT (provider, provider_payment_id) DO NOTHING
       RETURNING id`,
      [
        userId,
        provider,
        providerPaymentId,
        amountCents,
        currency,
        status,
        plan,
        periodStart,
        periodEnd,
        JSON.stringify(metadata || {}),
      ]
    );
    return { inserted: result.rowCount > 0, row: result.rows[0] || null };
  }
}

module.exports = { SubscriptionPaymentRepository };
