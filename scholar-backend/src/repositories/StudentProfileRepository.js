const { query } = require("../infra/db/neonClient");

class StudentProfileRepository {
  async findByUserId(userId) {
    const result = await query(
      `SELECT id, user_id, field_of_study, gpa, degree_level, preferred_country,
              interests, financial_need, preferred_funding_type, language_proficiency, 
              preferred_scholarship_type, goals, completeness_score, created_at, updated_at
       FROM student_profiles
       WHERE user_id = $1
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async createProfile(userId, payload) {
    const {
      fieldOfStudy,
      gpa,
      degreeLevel,
      preferredCountry,
      interests,
      financialNeed,
      preferredFundingType,
      languageProficiency,
      preferredScholarshipType,
      goals,
      completenessScore,
    } = payload;

    const result = await query(
      `INSERT INTO student_profiles (
         user_id, field_of_study, gpa, degree_level,
         preferred_country, interests, financial_need, preferred_funding_type,
         language_proficiency, preferred_scholarship_type, goals, completeness_score
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (user_id)
       DO UPDATE SET
         field_of_study = EXCLUDED.field_of_study,
         gpa = EXCLUDED.gpa,
         degree_level = EXCLUDED.degree_level,
         preferred_country = EXCLUDED.preferred_country,
         interests = EXCLUDED.interests,
         financial_need = EXCLUDED.financial_need,
         preferred_funding_type = EXCLUDED.preferred_funding_type,
         language_proficiency = EXCLUDED.language_proficiency,
         preferred_scholarship_type = EXCLUDED.preferred_scholarship_type,
         goals = EXCLUDED.goals,
         completeness_score = EXCLUDED.completeness_score,
         updated_at = NOW()
       RETURNING id, user_id, field_of_study, gpa, degree_level,
                 preferred_country, interests, financial_need, preferred_funding_type,
                 language_proficiency, preferred_scholarship_type, goals, completeness_score,
                 created_at, updated_at`,
      [
        userId,
        fieldOfStudy,
        gpa,
        degreeLevel,
        preferredCountry || null,
        interests || [],
        financialNeed || false,
        preferredFundingType || null,
        languageProficiency || [],
        preferredScholarshipType || null,
        goals || null,
        completenessScore,
      ]
    );
    return result.rows[0];
  }

  async updateProfile(userId, payload) {
    const {
      fieldOfStudy,
      gpa,
      degreeLevel,
      preferredCountry,
      interests,
      financialNeed,
      preferredFundingType,
      languageProficiency,
      preferredScholarshipType,
      goals,
      completenessScore,
    } = payload;

    const result = await query(
      `UPDATE student_profiles
       SET field_of_study = $2,
           gpa = $3,
           degree_level = $4,
           preferred_country = $5,
           interests = $6,
           financial_need = $7,
           preferred_funding_type = $8,
           language_proficiency = $9,
           preferred_scholarship_type = $10,
           goals = $11,
           completeness_score = $12,
           updated_at = NOW()
       WHERE user_id = $1
       RETURNING id, user_id, field_of_study, gpa, degree_level,
                 preferred_country, interests, financial_need, preferred_funding_type,
                 language_proficiency, preferred_scholarship_type, goals, completeness_score,
                 created_at, updated_at`,
      [
        userId,
        fieldOfStudy ?? null,
        gpa ?? null,
        degreeLevel ?? null,
        preferredCountry ?? null,
        Array.isArray(interests) ? interests : [],
        financialNeed ?? false,
        preferredFundingType ?? null,
        Array.isArray(languageProficiency) ? languageProficiency : [],
        preferredScholarshipType ?? null,
        goals ?? null,
        completenessScore,
      ]
    );
    return result.rows[0] || null;
  }
}

module.exports = { StudentProfileRepository };

