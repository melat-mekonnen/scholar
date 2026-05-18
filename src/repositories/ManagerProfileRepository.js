const { query } = require("../infra/db/neonClient");

class ManagerProfileRepository {
  async findByUserId(userId) {
    const result = await query(
      `SELECT id, user_id, job_title, organization_name, bio,
              public_contact_email, website_url, phone, created_at, updated_at
       FROM manager_profiles
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async upsert(userId, payload) {
    const {
      jobTitle,
      organizationName,
      bio,
      publicContactEmail,
      websiteUrl,
      phone,
    } = payload;

    const result = await query(
      `INSERT INTO manager_profiles (
         user_id, job_title, organization_name, bio,
         public_contact_email, website_url, phone
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id)
       DO UPDATE SET
         job_title = EXCLUDED.job_title,
         organization_name = EXCLUDED.organization_name,
         bio = EXCLUDED.bio,
         public_contact_email = EXCLUDED.public_contact_email,
         website_url = EXCLUDED.website_url,
         phone = EXCLUDED.phone,
         updated_at = NOW()
       RETURNING id, user_id, job_title, organization_name, bio,
                 public_contact_email, website_url, phone,
                 created_at, updated_at`,
      [
        userId,
        jobTitle ?? null,
        organizationName ?? null,
        bio ?? null,
        publicContactEmail ?? null,
        websiteUrl ?? null,
        phone ?? null,
      ]
    );
    return result.rows[0];
  }
}

module.exports = { ManagerProfileRepository };
