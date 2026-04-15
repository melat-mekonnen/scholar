const { query } = require("../infra/db/neonClient");

class ScholarshipRepository {
  async createByManager({
    title,
    country,
    degreeLevel,
    fieldOfStudy,
    fundingType,
    deadline,
    amount,
    description,
    applicationUrl,
    postedByUserId,
  }) {
    const result = await query(
      `INSERT INTO scholarships (
         title,
         country,
         degree_level,
         field_of_study,
         funding_type,
         deadline,
         amount,
         description,
         application_url,
         status,
         posted_by_user_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10)
       RETURNING id,
                 title,
                 country,
                 degree_level,
                 field_of_study,
                 funding_type,
                 deadline,
                 amount,
                 description,
                 application_url,
                 status,
                 posted_by_user_id,
                 created_at`,
      [
        title,
        country,
        degreeLevel,
        fieldOfStudy,
        fundingType,
        deadline,
        amount,
        description,
        applicationUrl,
        postedByUserId,
      ]
    );

    return result.rows[0];
  }

  async getDefaultRecommended(limit = 3) {
    const result = await query(
      `SELECT id, title, country, deadline, application_url
       FROM scholarships
       WHERE is_recommended_default = TRUE
       ORDER BY deadline ASC
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getPublicFilters() {
    const countriesResult = await query(
      `SELECT DISTINCT country
       FROM scholarships
       WHERE status = 'verified' AND country IS NOT NULL
       ORDER BY country ASC`,
      []
    );

    const degreeLevelsResult = await query(
      `SELECT DISTINCT degree_level
       FROM scholarships
       WHERE status = 'verified' AND degree_level IS NOT NULL
       ORDER BY degree_level ASC`,
      []
    );

    const fieldsResult = await query(
      `SELECT DISTINCT field_of_study
       FROM scholarships
       WHERE status = 'verified' AND field_of_study IS NOT NULL
       ORDER BY field_of_study ASC`,
      []
    );

    const fundingTypesResult = await query(
      `SELECT DISTINCT funding_type
       FROM scholarships
       WHERE status = 'verified' AND funding_type IS NOT NULL
       ORDER BY funding_type ASC`,
      []
    );

    return {
      countries: countriesResult.rows.map((r) => r.country),
      degreeLevels: degreeLevelsResult.rows.map((r) => r.degree_level),
      fieldsOfStudy: fieldsResult.rows.map((r) => r.field_of_study),
      fundingTypes: fundingTypesResult.rows.map((r) => r.funding_type),
    };
  }

  async searchPublic({
    q,
    countries,
    degreeLevels,
    fieldsOfStudy,
    fundingTypes,
    deadlineFrom,
    deadlineTo,
    sort,
    page,
    limit,
    status,
    bookmarkUserId,
  }) {
    const where = [];
    const params = [];

    const effectiveStatus = status || "verified";
    params.push(effectiveStatus);
    where.push(`s.status = $${params.length}`);

    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      const p = `$${params.length}`;
      where.push(
        `(LOWER(s.title) LIKE ${p} OR LOWER(s.country) LIKE ${p} OR LOWER(s.field_of_study) LIKE ${p} OR LOWER(s.description) LIKE ${p})`
      );
    }

    if (countries && countries.length) {
      params.push(countries);
      where.push(`s.country = ANY($${params.length})`);
    }

    if (degreeLevels && degreeLevels.length) {
      params.push(degreeLevels);
      where.push(`s.degree_level = ANY($${params.length})`);
    }

    if (fieldsOfStudy && fieldsOfStudy.length) {
      params.push(fieldsOfStudy);
      where.push(`s.field_of_study = ANY($${params.length})`);
    }

    if (fundingTypes && fundingTypes.length) {
      params.push(fundingTypes);
      where.push(`s.funding_type = ANY($${params.length})`);
    }

    if (deadlineFrom) {
      params.push(deadlineFrom);
      where.push(`s.deadline >= $${params.length}`);
    }

    if (deadlineTo) {
      params.push(deadlineTo);
      where.push(`s.deadline <= $${params.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countResult = await query(
      `SELECT COUNT(*) AS total FROM scholarships s ${whereClause}`,
      params
    );
    const total = Number(countResult.rows[0]?.total || 0);

    // Sorting
    let orderBy = "ORDER BY s.created_at DESC";
    switch (sort) {
      case "deadline_asc":
        orderBy = "ORDER BY s.deadline ASC NULLS LAST";
        break;
      case "deadline_desc":
        orderBy = "ORDER BY s.deadline DESC NULLS LAST";
        break;
      case "recent":
        orderBy = "ORDER BY s.created_at DESC";
        break;
      case "funding_amount":
        orderBy = "ORDER BY s.amount DESC NULLS LAST";
        break;
      case "relevance":
      default:
        // Basic relevance: if q present, prioritize title matches then recent
        if (q) {
          const qParamIndex = params.findIndex((v) => typeof v === "string" && v === `%${q.toLowerCase()}%`);
          const p = qParamIndex >= 0 ? `$${qParamIndex + 1}` : null;
          if (p) {
            orderBy = `ORDER BY (CASE WHEN LOWER(s.title) LIKE ${p} THEN 0 ELSE 1 END), s.created_at DESC`;
          }
        }
        break;
    }

    const offset = (page - 1) * limit;
    const baseParams = [...params];
    const listParams = [...baseParams];

    let isBookmarkedSelect = "FALSE AS is_bookmarked";
    if (bookmarkUserId) {
      listParams.push(bookmarkUserId);
      const uidIdx = listParams.length;
      isBookmarkedSelect = `EXISTS (SELECT 1 FROM bookmarks b WHERE b.scholarship_id = s.id AND b.user_id = $${uidIdx}) AS is_bookmarked`;
    }

    listParams.push(limit);
    const limitIdx = listParams.length;
    listParams.push(offset);
    const offsetIdx = listParams.length;

    const listResult = await query(
      `SELECT s.id,
              s.title,
              s.country,
              s.degree_level,
              s.field_of_study,
              s.funding_type,
              s.deadline,
              s.amount,
              s.description,
              s.application_url,
              (SELECT COUNT(*)::int FROM bookmarks bcnt WHERE bcnt.scholarship_id = s.id) AS bookmark_count,
              ${isBookmarkedSelect}
       FROM scholarships s
       ${whereClause}
       ${orderBy}
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      listParams
    );

    return {
      results: listResult.rows,
      total,
      page,
      limit,
    };
  }

  async findPublicById(id, { bookmarkUserId } = {}) {
    const params = [id];
    let isBookmarkedSelect = "FALSE AS is_bookmarked";
    if (bookmarkUserId) {
      params.push(bookmarkUserId);
      isBookmarkedSelect = `EXISTS (SELECT 1 FROM bookmarks b WHERE b.scholarship_id = s.id AND b.user_id = $2) AS is_bookmarked`;
    }

    const result = await query(
      `SELECT s.id,
              s.title,
              s.country,
              s.degree_level,
              s.field_of_study,
              s.funding_type,
              s.deadline,
              s.amount,
              s.description,
              s.application_url,
              s.created_at,
              (SELECT COUNT(*)::int FROM bookmarks bcnt WHERE bcnt.scholarship_id = s.id) AS bookmark_count,
              ${isBookmarkedSelect},
              u.id AS posted_by_id,
              u.full_name AS posted_by_full_name
       FROM scholarships s
       LEFT JOIN users u ON s.posted_by_user_id = u.id
       WHERE s.id = $1 AND s.status = 'verified'
       LIMIT 1`,
      params
    );
    return result.rows[0] || null;
  }

  async upsertDiscoveredScholarship({
    title,
    country,
    degreeLevel,
    fieldOfStudy,
    fundingType,
    deadline,
    amount,
    description,
    applicationUrl,
    sourceName,
    sourceUrl,
    externalId,
    aiConfidence,
  }) {
    const result = await query(
      `INSERT INTO scholarships (
         title,
         country,
         degree_level,
         field_of_study,
         funding_type,
         deadline,
         amount,
         description,
         application_url,
         status,
         source_name,
         source_url,
         external_id,
         ai_confidence,
         discovered_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',$10,$11,$12,$13,NOW())
       ON CONFLICT (source_url)
       DO UPDATE SET
         title = EXCLUDED.title,
         country = EXCLUDED.country,
         degree_level = EXCLUDED.degree_level,
         field_of_study = EXCLUDED.field_of_study,
         funding_type = EXCLUDED.funding_type,
         deadline = EXCLUDED.deadline,
         amount = EXCLUDED.amount,
         description = EXCLUDED.description,
         application_url = EXCLUDED.application_url,
         source_name = EXCLUDED.source_name,
         external_id = COALESCE(EXCLUDED.external_id, scholarships.external_id),
         ai_confidence = EXCLUDED.ai_confidence,
         discovered_at = NOW(),
         updated_at = NOW()
       RETURNING id, title, country, status, source_url`,
      [
        title,
        country,
        degreeLevel || null,
        fieldOfStudy || null,
        fundingType || null,
        deadline || null,
        amount || null,
        description || null,
        applicationUrl || null,
        sourceName || null,
        sourceUrl || null,
        externalId || null,
        aiConfidence != null ? Number(aiConfidence) : null,
      ],
    );
    return result.rows[0] || null;
  }
}

module.exports = { ScholarshipRepository };

