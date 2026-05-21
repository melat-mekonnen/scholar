const { query } = require("../infra/db/neonClient");

class CheckoutSessionRepository {
  async create({ userId, provider, providerSessionId, expiresInMinutes = 60 }) {
    const result = await query(
      `INSERT INTO subscription_checkout_sessions (
         user_id, provider, provider_session_id, status, expires_at
       )
       VALUES ($1, $2, $3, 'created', NOW() + ($4::int * INTERVAL '1 minute'))
       RETURNING id, user_id, provider, provider_session_id`,
      [userId, provider, providerSessionId, expiresInMinutes]
    );
    return result.rows[0];
  }

  async findUserIdByProviderSession(provider, providerSessionId) {
    const result = await query(
      `SELECT user_id
       FROM subscription_checkout_sessions
       WHERE provider = $1 AND provider_session_id = $2
       LIMIT 1`,
      [provider, providerSessionId]
    );
    return result.rows[0]?.user_id || null;
  }

  async markCompleted(provider, providerSessionId) {
    await query(
      `UPDATE subscription_checkout_sessions
       SET status = 'completed'
       WHERE provider = $1 AND provider_session_id = $2`,
      [provider, providerSessionId]
    );
  }
}

module.exports = { CheckoutSessionRepository };
