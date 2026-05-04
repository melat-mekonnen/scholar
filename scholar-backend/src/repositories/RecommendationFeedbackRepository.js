const { query } = require("../infra/db/neonClient");

class RecommendationFeedbackRepository {
  async logInteraction(userId, scholarshipId, interactionType) {
    const result = await query(
      `INSERT INTO recommendation_feedback (user_id, scholarship_id, interaction_type)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, scholarship_id, interaction_type, created_at`,
      [userId, scholarshipId, interactionType]
    );
    return result.rows[0];
  }
}

module.exports = { RecommendationFeedbackRepository };
