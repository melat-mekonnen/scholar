const { query } = require("../infra/db/neonClient");

class ScholarshipRepository {
  async expirePastDeadline() {
    await query(
      `UPDATE scholarships
       SET status = 'expired',
           updated_at = NOW()
       WHERE deadline IS NOT NULL
         AND deadline < CURRENT_DATE
         AND is_rolling = FALSE
         AND status IN ('verified', 'pending')`,
      [],
    );
  }

  async createScholarship({
    title,
    organizationName,
    country,
    degreeLevel,
    fieldOfStudy,
    fundingType,
    deadline,
    applicationStartDate,
    applicationEndDate,
    amount,
    description,
    applicationUrl,
    postedByUserId,
    status,
  }) {
    const result = await query(
      `INSERT INTO scholarships (
         title,
         organization_name,
         country,
         degree_level,
         field_of_study,
         funding_type,
         deadline,
         application_start_date,
         application_end_date,
         amount,
         description,
         application_url,
         status,
         posted_by_user_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING id,
                 title,
                 organization_name,
                 country,
                 degree_level,
                 field_of_study,
                 funding_type,
                 deadline,
                 application_start_date,
                 application_end_date,
                 amount,
                 description,
                 application_url,
                 status,
                 posted_by_user_id,
                 created_at`,
      [
        title,
        organizationName,
        country,
        degreeLevel,
        fieldOfStudy,
        fundingType,
        deadline,
        applicationStartDate,
        applicationEndDate,
        amount,
        description,
        applicationUrl,
        status,
        postedByUserId,
      ]
    );

    return result.rows[0];
  }

  async listMine({ userId, page = 1, pageSize = 20, search, status }) {
    const offset = (page - 1) * pageSize;
    const params = [userId];
    const where = ["posted_by_user_id = $1"];

    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      where.push(`(LOWER(title) LIKE $${params.length} OR LOWER(country) LIKE $${params.length})`);
    }
    if (status && status !== "all") {
      params.push(String(status));
      where.push(`status = $${params.length}`);
    }

    const whereClause = `WHERE ${where.join(" AND ")}`;
    const countResult = await query(
      `SELECT COUNT(*)::int AS total FROM scholarships ${whereClause}`,
      params,
    );

    params.push(pageSize);
    params.push(offset);
    const listResult = await query(
      `SELECT id, title, organization_name, country, degree_level, funding_type, deadline, application_start_date, application_end_date, status, rejection_reason, created_at
       FROM scholarships
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      scholarships: listResult.rows,
      total: Number(countResult.rows[0]?.total || 0),
      page,
      pageSize,
    };
  }

  async updateScholarshipById(id, patch) {
    const result = await query(
      `UPDATE scholarships
       SET title = COALESCE($2, title),
           organization_name = COALESCE($3, organization_name),
           country = COALESCE($4, country),
           degree_level = COALESCE($5, degree_level),
           field_of_study = COALESCE($6, field_of_study),
           funding_type = COALESCE($7, funding_type),
           deadline = COALESCE($8, deadline),
           application_start_date = COALESCE($9, application_start_date),
           application_end_date = COALESCE($10, application_end_date),
           amount = COALESCE($11, amount),
           description = COALESCE($12, description),
           application_url = COALESCE($13, application_url),
           status = COALESCE($14, status),
           rejection_reason = COALESCE($15, rejection_reason),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, organization_name, country, degree_level, field_of_study, funding_type, deadline,
                 application_start_date, application_end_date, amount, description, application_url, status, rejection_reason, posted_by_user_id, updated_at`,
      [
        id,
        patch.title ?? null,
        patch.organizationName ?? null,
        patch.country ?? null,
        patch.degreeLevel ?? null,
        patch.fieldOfStudy ?? null,
        patch.fundingType ?? null,
        patch.deadline ?? null,
        patch.applicationStartDate ?? null,
        patch.applicationEndDate ?? null,
        patch.amount ?? null,
        patch.description ?? null,
        patch.applicationUrl ?? null,
        patch.status ?? null,
        patch.rejectionReason ?? null,
      ],
    );
    return result.rows[0] || null;
  }

  async deleteScholarshipCascade(id) {
    await query("DELETE FROM applications WHERE scholarship_id = $1", [id]);
    await query("DELETE FROM bookmarks WHERE scholarship_id = $1", [id]);
    await query("DELETE FROM documents WHERE scholarship_id = $1", [id]);
    const result = await query("DELETE FROM scholarships WHERE id = $1 RETURNING id", [id]);
    return result.rows[0] || null;
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
       WHERE status = 'verified' AND (deadline IS NULL OR deadline >= CURRENT_DATE OR is_rolling = TRUE) AND country IS NOT NULL
       ORDER BY country ASC`,
      []
    );

    const degreeLevelsResult = await query(
      `SELECT DISTINCT degree_level
       FROM scholarships
       WHERE status = 'verified' AND (deadline IS NULL OR deadline >= CURRENT_DATE OR is_rolling = TRUE) AND degree_level IS NOT NULL
       ORDER BY degree_level ASC`,
      []
    );

    const fieldsResult = await query(
      `SELECT DISTINCT field_of_study
       FROM scholarships
       WHERE status = 'verified' AND (deadline IS NULL OR deadline >= CURRENT_DATE OR is_rolling = TRUE) AND field_of_study IS NOT NULL
       ORDER BY field_of_study ASC`,
      []
    );

    const fundingTypesResult = await query(
      `SELECT DISTINCT funding_type
       FROM scholarships
       WHERE status = 'verified' AND (deadline IS NULL OR deadline >= CURRENT_DATE OR is_rolling = TRUE) AND funding_type IS NOT NULL
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
    where.push(`COALESCE(s.record_type, 'scholarship') = 'scholarship'`);
    where.push(`(s.deadline IS NULL OR s.deadline >= CURRENT_DATE OR s.is_rolling = TRUE)`);

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
    let orderBy = "ORDER BY s.quality_score DESC NULLS LAST, s.updated_at DESC";
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
      case "quality":
        orderBy = "ORDER BY s.quality_score DESC NULLS LAST, s.updated_at DESC";
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
              s.title_am,
              s.organization_name,
              s.country,
              s.degree_level,
              s.field_of_study,
              s.funding_type,
              s.deadline,
              s.application_start_date,
              s.application_end_date,
              s.amount,
              s.description,
              s.description_am,
              s.application_url,
              s.is_rolling,
              s.record_type,
              s.application_status,
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
              s.title_am,
              s.organization_name,
              s.country,
              s.degree_level,
              s.field_of_study,
              s.funding_type,
              s.deadline,
              s.application_start_date,
              s.application_end_date,
              s.amount,
              s.description,
              s.description_am,
              s.application_url,
              s.is_rolling,
              s.record_type,
              s.application_status,
              s.created_at,
              (SELECT COUNT(*)::int FROM bookmarks bcnt WHERE bcnt.scholarship_id = s.id) AS bookmark_count,
              ${isBookmarkedSelect},
              u.id AS posted_by_id,
              u.full_name AS posted_by_full_name
       FROM scholarships s
       LEFT JOIN users u ON s.posted_by_user_id = u.id
       WHERE s.id = $1
         AND s.status = 'verified'
         AND (s.deadline IS NULL OR s.deadline >= CURRENT_DATE OR s.is_rolling = TRUE)
       LIMIT 1`,
      params
    );
    return result.rows[0] || null;
  }

  async findById(id) {
    const result = await query(
      `SELECT id, title, organization_name, country, degree_level, field_of_study, funding_type, deadline,
              application_start_date, application_end_date, amount, description, application_url, status, rejection_reason, posted_by_user_id, created_at, updated_at
       FROM scholarships
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    return result.rows[0] || null;
  }

  async findImportDuplicate({ sourceUrl, externalId, normalizedSourceUrl }) {
    if (!sourceUrl && !externalId && !normalizedSourceUrl) return null;
    if (externalId) {
      const byExt = await query(
        `SELECT id, title, source_url, application_url, external_id, status, country,
                degree_level, description, ingestion_tier
         FROM scholarships
         WHERE external_id = $1
         LIMIT 1`,
        [externalId],
      );
      if (byExt.rows[0]) return byExt.rows[0];
    }
    if (sourceUrl) {
      const bySource = await query(
        `SELECT id, title, source_url, application_url, external_id, status, country,
                degree_level, description, ingestion_tier
         FROM scholarships
         WHERE source_url = $1
         LIMIT 1`,
        [sourceUrl],
      );
      if (bySource.rows[0]) return bySource.rows[0];
    }
    if (normalizedSourceUrl) {
      const byNorm = await query(
        `SELECT id, title, source_url, application_url, external_id, status, country,
                degree_level, description, ingestion_tier
         FROM scholarships
         WHERE normalized_source_url = $1
         LIMIT 1`,
        [normalizedSourceUrl],
      );
      if (byNorm.rows[0]) return byNorm.rows[0];
    }
    return null;
  }

  async findByApplicationUrl(applicationUrl) {
    if (!applicationUrl) return null;
    const result = await query(
      `SELECT id, title, source_url, application_url, external_id, status, country,
              degree_level, description, ingestion_tier
       FROM scholarships
       WHERE application_url = $1
       LIMIT 1`,
      [applicationUrl],
    );
    return result.rows[0] || null;
  }

  async listImportCandidatesByCountry(country, limit = 100) {
    const result = await query(
      `SELECT id, title, source_url, application_url, external_id, status, country,
              degree_level, description, ingestion_tier
       FROM scholarships
       WHERE LOWER(country) = LOWER($1)
         AND status IN ('verified', 'pending')
       ORDER BY updated_at DESC
       LIMIT $2`,
      [country, limit],
    );
    return result.rows;
  }

  async upsertImportedScholarship({
    title,
    organizationName,
    country,
    degreeLevel,
    fieldOfStudy,
    fundingType,
    deadline,
    applicationStartDate,
    applicationEndDate,
    amount,
    description,
    applicationUrl,
    sourceName,
    sourceUrl,
    externalId,
    aiConfidence,
    publishStatus = "verified",
    isRolling = false,
    eligibleRegions = [],
    ingestionTier = null,
    normalizedSourceUrl = null,
    qualityScore = null,
    hostCountry = null,
    titleAm = null,
    descriptionAm = null,
    extractedFacts = null,
    recordType = "scholarship",
    applicationStatus = null,
  }) {
    const result = await query(
      `INSERT INTO scholarships (
         title,
         title_am,
         organization_name,
         country,
         host_country,
         degree_level,
         field_of_study,
         funding_type,
         deadline,
         application_start_date,
         application_end_date,
         amount,
         description,
         description_am,
         extracted_facts,
         application_url,
         status,
         source_name,
         source_url,
         external_id,
         ai_confidence,
         is_rolling,
         eligible_regions,
         ingestion_tier,
         normalized_source_url,
         quality_score,
         record_type,
         application_status,
         discovered_at
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,NOW())
       ON CONFLICT (source_url) WHERE source_url IS NOT NULL AND source_url <> ''
       DO UPDATE SET
         title = EXCLUDED.title,
         title_am = COALESCE(EXCLUDED.title_am, scholarships.title_am),
         organization_name = EXCLUDED.organization_name,
         country = EXCLUDED.country,
         host_country = COALESCE(EXCLUDED.host_country, scholarships.host_country),
         degree_level = EXCLUDED.degree_level,
         field_of_study = EXCLUDED.field_of_study,
         funding_type = EXCLUDED.funding_type,
         deadline = COALESCE(EXCLUDED.deadline, scholarships.deadline),
         application_start_date = EXCLUDED.application_start_date,
         application_end_date = EXCLUDED.application_end_date,
         amount = EXCLUDED.amount,
         description = CASE
           WHEN scholarships.description ILIKE '%Fulbright U.S. Student Program provides grants%'
             THEN EXCLUDED.description
           WHEN scholarships.description ILIKE '%Open toolbar Accessibility%'
             THEN EXCLUDED.description
           WHEN scholarships.description ILIKE '%Increase Text Decrease Text%'
             THEN EXCLUDED.description
           WHEN LENGTH(COALESCE(EXCLUDED.description, '')) > LENGTH(COALESCE(scholarships.description, ''))
             THEN EXCLUDED.description
           ELSE scholarships.description
         END,
         description_am = COALESCE(EXCLUDED.description_am, scholarships.description_am),
         extracted_facts = COALESCE(EXCLUDED.extracted_facts, scholarships.extracted_facts),
         application_url = EXCLUDED.application_url,
         status = CASE
           WHEN EXCLUDED.status = 'verified' THEN 'verified'
           WHEN scholarships.status = 'verified' THEN 'verified'
           WHEN scholarships.status IN ('rejected', 'duplicate', 'expired')
             AND EXCLUDED.status IN ('verified', 'needs_review', 'pending') THEN EXCLUDED.status
           ELSE EXCLUDED.status
         END,
         source_name = EXCLUDED.source_name,
         external_id = COALESCE(EXCLUDED.external_id, scholarships.external_id),
         ai_confidence = EXCLUDED.ai_confidence,
         is_rolling = EXCLUDED.is_rolling OR scholarships.is_rolling,
         eligible_regions = CASE
           WHEN COALESCE(array_length(EXCLUDED.eligible_regions, 1), 0) > 0
             THEN EXCLUDED.eligible_regions
           ELSE scholarships.eligible_regions
         END,
         ingestion_tier = COALESCE(EXCLUDED.ingestion_tier, scholarships.ingestion_tier),
         normalized_source_url = COALESCE(EXCLUDED.normalized_source_url, scholarships.normalized_source_url),
         quality_score = COALESCE(EXCLUDED.quality_score, scholarships.quality_score),
         record_type = COALESCE(EXCLUDED.record_type, scholarships.record_type),
         application_status = COALESCE(EXCLUDED.application_status, scholarships.application_status),
         discovered_at = NOW(),
         updated_at = NOW()
       RETURNING id, title, country, status, source_url`,
      [
        title,
        titleAm || null,
        organizationName || null,
        country,
        hostCountry || country,
        degreeLevel || null,
        fieldOfStudy || null,
        fundingType || null,
        deadline || null,
        applicationStartDate || null,
        applicationEndDate || null,
        amount || null,
        description || null,
        descriptionAm || null,
        extractedFacts ? JSON.stringify(extractedFacts) : null,
        applicationUrl || null,
        publishStatus,
        sourceName || null,
        sourceUrl || null,
        externalId || null,
        aiConfidence != null ? Number(aiConfidence) : null,
        Boolean(isRolling),
        Array.isArray(eligibleRegions) ? eligibleRegions : [],
        ingestionTier || null,
        normalizedSourceUrl || null,
        qualityScore != null ? Number(qualityScore) : null,
        recordType || "scholarship",
        applicationStatus || null,
      ],
    );
    return result.rows[0] || null;
  }

  async updateImportedScholarship(id, fields) {
    const result = await query(
      `UPDATE scholarships
       SET title = $2,
           organization_name = $3,
           country = $4,
           degree_level = $5,
           field_of_study = $6,
           funding_type = $7,
           deadline = COALESCE($8, deadline),
           amount = $9,
           description = CASE
             WHEN LENGTH(COALESCE($10, '')) > LENGTH(COALESCE(description, '')) THEN $10
             ELSE description
           END,
           application_url = $11,
           status = CASE
             WHEN $12 = 'verified' THEN 'verified'
             WHEN status = 'verified' THEN status
             WHEN status IN ('rejected', 'duplicate', 'expired')
               AND $12 IN ('verified', 'needs_review', 'pending') THEN $12
             ELSE COALESCE($12, status)
           END,
           source_name = $13,
           source_url = $14,
           external_id = COALESCE($15, external_id),
           ai_confidence = $16,
           is_rolling = $17 OR is_rolling,
           eligible_regions = CASE
             WHEN COALESCE(array_length($18::text[], 1), 0) > 0 THEN $18
             ELSE eligible_regions
           END,
           ingestion_tier = COALESCE($19, ingestion_tier),
           normalized_source_url = COALESCE($20, normalized_source_url),
           host_country = COALESCE($21, host_country),
           quality_score = COALESCE($22, quality_score),
           discovered_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title, country, status, source_url`,
      [
        id,
        fields.title,
        fields.organizationName || null,
        fields.country,
        fields.degreeLevel || null,
        fields.fieldOfStudy || null,
        fields.fundingType || null,
        fields.deadline || null,
        fields.amount || null,
        fields.description || null,
        fields.applicationUrl || null,
        fields.publishStatus || "pending",
        fields.sourceName || null,
        fields.sourceUrl || null,
        fields.externalId || null,
        fields.aiConfidence != null ? Number(fields.aiConfidence) : null,
        Boolean(fields.isRolling),
        Array.isArray(fields.eligibleRegions) ? fields.eligibleRegions : [],
        fields.ingestionTier || null,
        fields.normalizedSourceUrl || null,
        fields.hostCountry || null,
        fields.qualityScore != null ? Number(fields.qualityScore) : null,
      ],
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
    applicationStartDate,
    applicationEndDate,
    amount,
    description,
    applicationUrl,
    sourceName,
    sourceUrl,
    externalId,
    aiConfidence,
  }) {
    return this.upsertImportedScholarship({
      title,
      organizationName: null,
      country,
      degreeLevel,
      fieldOfStudy,
      fundingType,
      deadline,
      applicationStartDate,
      applicationEndDate,
      amount,
      description,
      applicationUrl,
      sourceName,
      sourceUrl,
      externalId,
      aiConfidence,
      publishStatus: "pending",
    });
  }

  async listForContentEnrichment({ limit = 50, onlyMissingAm = false } = {}) {
    const params = [limit];
    let extra = "";
    if (onlyMissingAm) {
      extra = "AND (description_am IS NULL OR title_am IS NULL)";
    }
    const result = await query(
      `SELECT id, title, organization_name, country, host_country, degree_level, field_of_study,
              funding_type, deadline, application_start_date, application_end_date, amount,
              description, application_url, source_url, is_rolling, eligible_regions, record_type
       FROM scholarships
       WHERE status IN ('verified', 'pending')
         AND COALESCE(record_type, 'scholarship') = 'scholarship'
         ${extra}
       ORDER BY updated_at DESC
       LIMIT $1`,
      params,
    );
    return result.rows;
  }

  async updateContentFields(id, fields) {
    const result = await query(
      `UPDATE scholarships
       SET description = COALESCE($2, description),
           title_am = COALESCE($3, title_am),
           description_am = COALESCE($4, description_am),
           extracted_facts = COALESCE($5, extracted_facts),
           application_status = COALESCE($6, application_status),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title`,
      [
        id,
        fields.description || null,
        fields.titleAm || null,
        fields.descriptionAm || null,
        fields.extractedFacts ? JSON.stringify(fields.extractedFacts) : null,
        fields.applicationStatus || null,
      ],
    );
    return result.rows[0] || null;
  }

  async rejectBareHomepageScholarships() {
    const result = await query(
      `UPDATE scholarships
       SET status = 'rejected',
           rejection_reason = 'bare homepage URL — not a leaf programme page',
           updated_at = NOW()
       WHERE status IN ('verified', 'pending', 'needs_review')
         AND (
           application_url ~* '^https?://[^/]+/?$'
           OR source_url ~* '^https?://[^/]+/?$'
         )
       RETURNING id, title, application_url`,
      [],
    );
    return result.rows;
  }

  async promoteCuratedLeafScholarships() {
    const result = await query(
      `UPDATE scholarships
       SET status = 'verified',
           updated_at = NOW()
       WHERE source_name = 'PHASE1_CURATED'
         AND status = 'needs_review'
         AND length(COALESCE(description, '')) >= 120
         AND application_url IS NOT NULL
         AND application_url !~* '^https?://[^/]+/?$'
         AND source_url !~* '^https?://[^/]+/?$'
       RETURNING id, title`,
      [],
    );
    return result.rows;
  }

  async purgeStaleCuratedDuplicates() {
    const result = await query(
      `DELETE FROM scholarships stale
       WHERE stale.source_name = 'PHASE1_CURATED'
         AND stale.status = 'rejected'
         AND EXISTS (
           SELECT 1 FROM scholarships live
           WHERE live.source_name = 'PHASE1_CURATED'
             AND live.status = 'verified'
             AND live.external_id = stale.external_id
             AND live.id <> stale.id
         )
       RETURNING stale.id, stale.title`,
      [],
    );
    return result.rows;
  }

  async reactivateCuratedLeafScholarships() {
    const result = await query(
      `UPDATE scholarships
       SET status = 'verified',
           rejection_reason = NULL,
           updated_at = NOW()
       WHERE source_name = 'PHASE1_CURATED'
         AND status IN ('rejected', 'pending', 'expired')
         AND length(COALESCE(description, '')) >= 120
         AND application_url IS NOT NULL
         AND application_url !~* '^https?://[^/]+/?$'
         AND source_url !~* '^https?://[^/]+/?$'
       RETURNING id, title`,
      [],
    );
    return result.rows;
  }
}

module.exports = { ScholarshipRepository };

