const { query } = require("../infra/db/neonClient");

class UserRepository {
  async findByEmail(email) {
    const result = await query(
      "SELECT id, full_name, email, password_hash, google_id, auth_provider, role, is_active FROM users WHERE email = $1 LIMIT 1",
      [email]
      
    );
    return result.rows[0] || null;
  }

  async findById(id) {
    const result = await query(
      "SELECT id, full_name, email, password_hash, google_id, auth_provider, role, is_active FROM users WHERE id = $1 LIMIT 1",
      [id]
    );
    return result.rows[0] || null;
  }

  async findByGoogleId(googleId) {
    const result = await query(
      "SELECT id, full_name, email, password_hash, google_id, auth_provider, role, is_active FROM users WHERE google_id = $1 LIMIT 1",
      [googleId]
    );
    return result.rows[0] || null;
  }

  async createLocalUser({ fullName, email, passwordHash }) {
    const result = await query(
      `INSERT INTO users (full_name, email, password_hash, auth_provider, role, is_active)
       VALUES ($1, $2, $3, 'local', 'student', TRUE)
       RETURNING id, full_name, email, google_id, auth_provider, role, is_active`,
      [fullName, email.toLowerCase(), passwordHash]
    );
    return result.rows[0];
  }

  async upsertGoogleUser({ googleId, fullName, email }) {
    const result = await query(
      `INSERT INTO users (google_id, full_name, email, auth_provider, role, is_active)
       VALUES ($1, $2, $3, 'google', 'student', TRUE)
       ON CONFLICT (google_id)
       DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email
       RETURNING id, full_name, email, google_id, auth_provider, role, is_active`,
      [googleId, fullName, email.toLowerCase()]
    );
    return result.rows[0];
  }

  async updateGoogleUserByGoogleId({ googleId, fullName, email }) {
    const result = await query(
      `UPDATE users
       SET full_name = $2,
           email = $3,
           google_id = $1,
           auth_provider = 'google',
           is_active = TRUE,
           updated_at = NOW()
       WHERE google_id = $1
       RETURNING id, full_name, email, google_id, auth_provider, role, is_active`,
      [googleId, fullName, email.toLowerCase()],
    );
    return result.rows[0] || null;
  }

  async updateGoogleUserByEmail({ googleId, fullName, email }) {
    const result = await query(
      `UPDATE users
       SET google_id = $1,
           full_name = $2,
           email = $3,
           auth_provider = 'google',
           is_active = TRUE,
           updated_at = NOW()
       WHERE email = $3
       RETURNING id, full_name, email, google_id, auth_provider, role, is_active`,
      [googleId, fullName, email.toLowerCase()],
    );
    return result.rows[0] || null;
  }

  async listUsers({ page = 1, pageSize = 20, search, role }) {
    const offset = (page - 1) * pageSize;
    const params = [];
    const conditions = [];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      conditions.push("(LOWER(full_name) LIKE $"+params.length+" OR LOWER(email) LIKE $"+params.length+")");
    }

    if (role) {
      params.push(role);
      conditions.push(`role = $${params.length}`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM users ${whereClause}`,
      params
    );

    params.push(pageSize);
    params.push(offset);

    const listResult = await query(
      `SELECT id, full_name, email, google_id, auth_provider, role, is_active, created_at
       FROM users
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );

    return {
      users: listResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
      page,
      pageSize,
    };
  }

  async updateUser(id, { fullName, email }) {
    const result = await query(
      `UPDATE users
       SET full_name = COALESCE($2, full_name),
           email = COALESCE($3, email),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, full_name, email, google_id, auth_provider, role, is_active`,
      [id, fullName, email && email.toLowerCase()]
    );
    return result.rows[0] || null;
  }

  async deleteUser(id) {
    await query("DELETE FROM users WHERE id = $1", [id]);
  }

  async setActive(id, isActive) {
    const result = await query(
      `UPDATE users
       SET is_active = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, full_name, email, google_id, auth_provider, role, is_active`,
      [id, isActive]
    );
    return result.rows[0] || null;
  }

  async updateRole(id, role) {
    const result = await query(
      `UPDATE users
       SET role = $2,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, full_name, email, google_id, auth_provider, role, is_active`,
      [id, role]
    );
    return result.rows[0] || null;
  }
}

module.exports = { UserRepository };

