const { query } = require("../infra/db/neonClient");

class SubscriptionRepository {
  async getByUserId(userId) {
    const result = await query(
      `SELECT id, role, subscription_plan, subscription_expires_at,
              subscription_provider, subscription_external_id
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async setPlan(userId, { plan, expiresAt = null, provider = null, externalId = null }) {
    const result = await query(
      `UPDATE users
       SET subscription_plan = $2,
           subscription_expires_at = $3,
           subscription_provider = $4,
           subscription_external_id = $5,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, role, subscription_plan, subscription_expires_at,
                 subscription_provider, subscription_external_id`,
      [userId, plan, expiresAt, provider, externalId]
    );
    return result.rows[0] || null;
  }
}

module.exports = { SubscriptionRepository };
