const { query } = require("../infra/db/neonClient");

class AdminAuditLogRepository {
  async create({ actorUserId, action, targetType, targetId, metadata }) {
    const result = await query(
      `INSERT INTO admin_audit_logs (actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       RETURNING id, actor_user_id, action, target_type, target_id, metadata, created_at`,
      [actorUserId, action, targetType || null, targetId || null, JSON.stringify(metadata || {})],
    );
    return result.rows[0] || null;
  }

  async list({ page = 1, pageSize = 20, action, actorUserId, targetType }) {
    const offset = (page - 1) * pageSize;
    const params = [];
    const conditions = [];

    if (action) {
      params.push(String(action).trim());
      conditions.push(`l.action = $${params.length}`);
    }
    if (actorUserId) {
      params.push(String(actorUserId).trim());
      conditions.push(`l.actor_user_id = $${params.length}`);
    }
    if (targetType) {
      params.push(String(targetType).trim());
      conditions.push(`l.target_type = $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await query(
      `SELECT COUNT(*)::int AS total
       FROM admin_audit_logs l
       ${whereClause}`,
      params,
    );

    params.push(pageSize);
    params.push(offset);

    const listResult = await query(
      `SELECT
          l.id,
          l.actor_user_id,
          u.full_name AS actor_full_name,
          u.email AS actor_email,
          l.action,
          l.target_type,
          l.target_id,
          l.metadata,
          l.created_at
       FROM admin_audit_logs l
       LEFT JOIN users u ON u.id = l.actor_user_id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      logs: listResult.rows,
      total: Number(countResult.rows[0]?.total || 0),
      page,
      pageSize,
    };
  }
}

module.exports = { AdminAuditLogRepository };
