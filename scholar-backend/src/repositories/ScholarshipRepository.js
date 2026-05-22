const { query } = require("../infra/db/neonClient");
const { curatedLeafSourceNames } = require("../modules/scholarship-ingestion/sourceNames");

const CURATED_LEAF_SOURCES = curatedLeafSourceNames();

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
    const fieldCategory = resolveFieldCategory({ fieldOfStudy, title, degreeLevel });
    const result = await query(
      `INSERT INTO scholarships (
         title,
         organization_name,
         country,
         degree_level,
         field_of_study,
         field_category,
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
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
        fieldCategory,
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
      `SELECT id, title, title_am, description, description_am, organization_name, organization_name_am,
              country, country_am, field_of_study, field_of_study_am, deadline, application_url
       FROM scholarships
       WHERE is_recommended_default = TRUE
         AND status = 'verified'
         AND (deadline IS NULL OR deadline >= CURRENT_DATE)
       ORDER BY deadline ASC NULLS LAST
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  /** Fallback when no scholarships are flagged is_recommended_default. */
  async getUpcomingVerified(limit = 3) {
    const result = await query(
      `SELECT id, title, title_am, description, description_am, organization_name, organization_name_am,
              country, country_am, field_of_study, field_of_study_am, deadline, application_url
       FROM scholarships
       WHERE status = 'verified'
         AND (deadline IS NULL OR deadline >= CURRENT_DATE)
       ORDER BY deadline ASC NULLS LAST
       LIMIT $1`,
      [limit]
    );
    return result.rows;
  }

  async getPublicFilters() {
    const [hostCountriesResult, eligibleRegionsResult, degreeLevelsResult, fieldsResult, fundingTypesResult] =
      await Promise.all([
        query(
          `SELECT COALESCE(host_country, country) AS value, COUNT(*)::int AS count
           FROM scholarships
           WHERE ${PUBLIC_SCHOLARSHIP_WHERE}
             AND COALESCE(host_country, country) IS NOT NULL
           GROUP BY 1
           ORDER BY count DESC, value ASC`,
          [],
        ),
        query(
          `SELECT LOWER(TRIM(region)) AS value, COUNT(*)::int AS count
           FROM scholarships, UNNEST(eligible_regions) AS region
           WHERE ${PUBLIC_SCHOLARSHIP_WHERE}
             AND eligible_regions IS NOT NULL
             AND eligible_regions <> '{}'
           GROUP BY 1
           ORDER BY count DESC, value ASC`,
          [],
        ),
        query(
          `SELECT degree_level AS value, COUNT(*)::int AS count
           FROM scholarships
           WHERE ${PUBLIC_SCHOLARSHIP_WHERE}
             AND degree_level IS NOT NULL
           GROUP BY degree_level
           ORDER BY count DESC, degree_level ASC`,
          [],
        ),
        query(
          `SELECT field_category AS value, COUNT(*)::int AS count
           FROM scholarships
           WHERE ${PUBLIC_SCHOLARSHIP_WHERE}
             AND field_category IS NOT NULL
           GROUP BY field_category
           ORDER BY count DESC, field_category ASC`,
          [],
        ),
        query(
          `SELECT funding_type AS value, COUNT(*)::int AS count
           FROM scholarships
           WHERE ${PUBLIC_SCHOLARSHIP_WHERE}
             AND funding_type IS NOT NULL
           GROUP BY funding_type
           ORDER BY count DESC, funding_type ASC`,
          [],
        ),
      ]);

    const hostCountries = mapFacetRows(hostCountriesResult.rows);

    return {
      hostCountries,
      hostRegions: aggregateHostRegionFacets(hostCountries),
      eligibleRegions: mapFacetRows(eligibleRegionsResult.rows),
      degreeLevels: mapFacetRows(degreeLevelsResult.rows),
      fieldsOfStudy: mapFacetRows(fieldsResult.rows),
      fieldCategories: mapFacetRows(fieldsResult.rows),
      fundingTypes: mapFacetRows(fundingTypesResult.rows),
    };
  }

  async searchPublic({
    q,
    hostCountries,
    eligibleRegions,
    availability,
    degreeLevels,
    fieldCategories,
    fieldsOfStudy,
    fundingTypes,
    deadlineFrom,
    deadlineTo,
    sort,
    page,
    limit,
    status,
    bookmarkUserId,
    applicationFilter,
    applicationUserId,
    shuffleSeed,
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

    if (hostCountries && hostCountries.length) {
      params.push(hostCountries);
      where.push(`COALESCE(s.host_country, s.country) = ANY($${params.length})`);
    }

    if (eligibleRegions && eligibleRegions.length) {
      params.push(eligibleRegions.map((r) => String(r).toLowerCase()));
      where.push(`s.eligible_regions && $${params.length}::text[]`);
    }

    if (availability === "rolling") {
      where.push(`(s.is_rolling = TRUE OR s.application_status = 'rolling')`);
    } else if (availability === "open") {
      where.push(`(
        COALESCE(s.application_status, 'open') <> 'closed'
        AND (
          s.is_rolling = TRUE
          OR s.application_status IN ('open', 'rolling')
          OR s.deadline IS NULL
          OR s.deadline >= CURRENT_DATE
        )
      )`);
    } else if (availability === "closing_soon") {
      where.push(`(
        s.deadline IS NOT NULL
        AND s.deadline >= CURRENT_DATE
        AND s.deadline <= CURRENT_DATE + INTERVAL '30 days'
      )`);
    }

    if (degreeLevels && degreeLevels.length) {
      params.push(degreeLevels);
      where.push(`s.degree_level = ANY($${params.length})`);
    }

    if (fieldCategories && fieldCategories.length) {
      params.push(fieldCategories);
      where.push(`s.field_category = ANY($${params.length})`);
    } else if (fieldsOfStudy && fieldsOfStudy.length) {
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

    if (applicationFilter === "applied" && applicationUserId) {
      params.push(applicationUserId);
      params.push(["submitted", "accepted"]);
      where.push(
        `EXISTS (
           SELECT 1 FROM applications app
           WHERE app.scholarship_id = s.id
             AND app.user_id = $${params.length - 1}
             AND app.status = ANY($${params.length})
         )`,
      );
    } else if (applicationFilter === "not_applied" && applicationUserId) {
      params.push(applicationUserId);
      params.push(["submitted", "accepted"]);
      where.push(
        `NOT EXISTS (
           SELECT 1 FROM applications app
           WHERE app.scholarship_id = s.id
             AND app.user_id = $${params.length - 1}
             AND app.status = ANY($${params.length})
         )`,
      );
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
        if (q) {
          const qParamIndex = params.findIndex((v) => typeof v === "string" && v === `%${q.toLowerCase()}%`);
          const p = qParamIndex >= 0 ? `$${qParamIndex + 1}` : null;
          if (p) {
            orderBy = `ORDER BY (CASE WHEN LOWER(s.title) LIKE ${p} THEN 0 ELSE 1 END), s.created_at DESC`;
          }
        } else {
          params.push(shuffleSeed || "browse-default");
          orderBy = `ORDER BY (CASE WHEN s.title ILIKE 'Commonwealth%' THEN 1 ELSE 0 END), md5(s.id::text || $${params.length})`;
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
              s.organization_name_am,
              s.country,
              s.country_am,
              s.host_country,
              s.host_country_am,
              s.degree_level,
              s.field_of_study,
              s.field_of_study_am,
              s.field_category,
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
              s.quality_score,
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
              s.organization_name_am,
              s.country,
              s.country_am,
              s.host_country,
              s.host_country_am,
              s.degree_level,
              s.field_of_study,
              s.field_of_study_am,
              s.field_category,
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
      `SELECT id, title, title_am, organization_name, country, degree_level, field_of_study, funding_type, deadline,
              application_start_date, application_end_date, amount, description, description_am, application_url, status, rejection_reason, posted_by_user_id, created_at, updated_at
       FROM scholarships
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    return result.rows[0] || null;
  }

  async findContentForTranslation(id) {
    const result = await query(
      `SELECT id, title, title_am, description, description_am, status,
              organization_name, organization_name_am, country, country_am,
              host_country, host_country_am, field_of_study, field_of_study_am
       FROM scholarships
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    return result.rows[0] || null;
  }

  async findImportDuplicate({ sourceUrl, externalId, normalizedSourceUrl, sourceName }) {
    if (!sourceUrl && !externalId && !normalizedSourceUrl) return null;
    if (sourceUrl) {
      const bySource = await query(
        `SELECT id, title, source_url, application_url, external_id, status, country,
                degree_level, description, ingestion_tier, source_name, organization_name,
                quality_score, normalized_source_url
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
                degree_level, description, ingestion_tier, source_name, organization_name,
                quality_score, normalized_source_url
         FROM scholarships
         WHERE normalized_source_url = $1
         LIMIT 1`,
        [normalizedSourceUrl],
      );
      if (byNorm.rows[0]) return byNorm.rows[0];
    }
    if (externalId && sourceName) {
      const bySourceExt = await query(
        `SELECT id, title, source_url, application_url, external_id, status, country,
                degree_level, description, ingestion_tier, source_name, organization_name,
                quality_score, normalized_source_url
         FROM scholarships
         WHERE external_id = $1
           AND source_name = $2
         LIMIT 1`,
        [externalId, sourceName],
      );
      if (bySourceExt.rows[0]) return bySourceExt.rows[0];
    }
    return null;
  }

  async findByApplicationUrl(applicationUrl) {
    if (!applicationUrl) return null;
    const normalizedTarget = normalizeUrl(applicationUrl);
    if (!normalizedTarget) return null;

    const exact = await query(
      `SELECT id, title, source_url, application_url, external_id, status, country,
              degree_level, description, ingestion_tier, source_name, organization_name,
              quality_score, normalized_source_url
       FROM scholarships
       WHERE application_url = $1
       LIMIT 1`,
      [applicationUrl],
    );
    if (exact.rows[0] && normalizeUrl(exact.rows[0].application_url) === normalizedTarget) {
      return exact.rows[0];
    }

    const { rows } = await query(
      `SELECT id, title, source_url, application_url, external_id, status, country,
              degree_level, description, ingestion_tier, source_name, organization_name,
              quality_score, normalized_source_url
       FROM scholarships
       WHERE application_url IS NOT NULL
         AND status NOT IN ('duplicate', 'rejected', 'expired')`,
    );
    for (const row of rows) {
      if (normalizeUrl(row.application_url) === normalizedTarget) {
        return row;
      }
    }
    return null;
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
    replaceDescription = false,
  }) {
    const fieldCategory = resolveFieldCategory({ fieldOfStudy, title, degreeLevel });
    const result = await query(
      `INSERT INTO scholarships (
         title,
         title_am,
         organization_name,
         country,
         host_country,
         degree_level,
         field_of_study,
         field_category,
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
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,NOW())
       ON CONFLICT (source_url) WHERE source_url IS NOT NULL AND source_url <> ''
       DO UPDATE SET
         title = EXCLUDED.title,
         title_am = COALESCE(EXCLUDED.title_am, scholarships.title_am),
         organization_name = EXCLUDED.organization_name,
         country = EXCLUDED.country,
         host_country = COALESCE(EXCLUDED.host_country, scholarships.host_country),
         degree_level = EXCLUDED.degree_level,
         field_of_study = EXCLUDED.field_of_study,
         field_category = EXCLUDED.field_category,
         funding_type = EXCLUDED.funding_type,
         deadline = COALESCE(EXCLUDED.deadline, scholarships.deadline),
         application_start_date = EXCLUDED.application_start_date,
         application_end_date = EXCLUDED.application_end_date,
         amount = EXCLUDED.amount,
         description = CASE
           WHEN $30::boolean THEN EXCLUDED.description
           WHEN scholarships.description ILIKE '%Fulbright U.S. Student Program provides grants%'
             THEN EXCLUDED.description
           WHEN scholarships.description ILIKE '%Open toolbar Accessibility%'
             THEN EXCLUDED.description
           WHEN scholarships.description ILIKE '%Increase Text Decrease Text%'
             THEN EXCLUDED.description
           WHEN LENGTH(COALESCE(EXCLUDED.description, '')) > LENGTH(COALESCE(scholarships.description, ''))
             AND LENGTH(COALESCE(EXCLUDED.description, '')) < LENGTH(COALESCE(scholarships.description, '')) * 3
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
        fieldCategory,
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
        Boolean(replaceDescription),
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

  async listForContentEnrichment({
    limit = 50,
    all = false,
    onlyMissingAm = false,
    onlyUnrefined = false,
  } = {}) {
    const params = [];
    const where = [
      `status IN ('verified', 'pending')`,
      `COALESCE(record_type, 'scholarship') = 'scholarship'`,
    ];

    if (onlyMissingAm) {
      where.push(`(description_am IS NULL OR title_am IS NULL)`);
    }
    if (onlyUnrefined) {
      where.push(`(extracted_facts IS NULL OR description NOT LIKE '## Overview%')`);
    }

    let limitClause = "";
    if (!all) {
      params.push(limit);
      limitClause = `LIMIT $${params.length}`;
    }

    const result = await query(
      `SELECT id, title, organization_name, country, host_country, degree_level, field_of_study,
              funding_type, deadline, application_start_date, application_end_date, amount,
              description, application_url, source_url, is_rolling, eligible_regions, record_type,
              extracted_facts, application_status
       FROM scholarships
       WHERE ${where.join(" AND ")}
       ORDER BY updated_at DESC
       ${limitClause}`,
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
           deadline = COALESCE($7, deadline),
           application_start_date = COALESCE($8, application_start_date),
           application_end_date = COALESCE($9, application_end_date),
           is_rolling = COALESCE($10, is_rolling),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title`,
      [
        id,
        fields.description || null,
        fields.titleAm || null,
        fields.descriptionAm || null,
        fields.organizationNameAm || null,
        fields.countryAm || null,
        fields.hostCountryAm || null,
        fields.fieldOfStudyAm || null,
        fields.extractedFacts ? JSON.stringify(fields.extractedFacts) : null,
        fields.applicationStatus || null,
        fields.deadline || null,
        fields.applicationStartDate || null,
        fields.applicationEndDate || null,
        fields.isRolling == null ? null : Boolean(fields.isRolling),
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
       WHERE source_name = ANY($1::text[])
         AND status = 'needs_review'
         AND length(COALESCE(description, '')) >= 120
         AND application_url IS NOT NULL
         AND application_url !~* '^https?://[^/]+/?$'
         AND source_url !~* '^https?://[^/]+/?$'
       RETURNING id, title`,
      [CURATED_LEAF_SOURCES],
    );
    return result.rows;
  }

  async purgeStaleCuratedDuplicates() {
    const result = await query(
      `DELETE FROM scholarships stale
       WHERE stale.source_name = ANY($1::text[])
         AND stale.status = 'rejected'
         AND EXISTS (
           SELECT 1 FROM scholarships live
           WHERE live.source_name = ANY($1::text[])
             AND live.status = 'verified'
             AND live.external_id = stale.external_id
             AND live.id <> stale.id
         )
       RETURNING stale.id, stale.title`,
      [CURATED_LEAF_SOURCES],
    );
    return result.rows;
  }

  async reactivateCuratedLeafScholarships() {
    const result = await query(
      `UPDATE scholarships
       SET status = 'verified',
           rejection_reason = NULL,
           updated_at = NOW()
       WHERE source_name = ANY($1::text[])
         AND status IN ('rejected', 'pending', 'expired')
         AND length(COALESCE(description, '')) >= 120
         AND application_url IS NOT NULL
         AND application_url !~* '^https?://[^/]+/?$'
         AND source_url !~* '^https?://[^/]+/?$'
       RETURNING id, title`,
      [CURATED_LEAF_SOURCES],
    );
    return result.rows;
  }

  async normalizeLegacySourceNames() {
    await query(
      `UPDATE scholarships SET source_name = 'CURATED_LEAF' WHERE source_name = 'PHASE1_CURATED'`,
      [],
    );
    await query(
      `UPDATE scholarships SET source_name = 'UK_FUNDING_DISCOVERY' WHERE source_name = 'PHASE3_BURSARY'`,
      [],
    );
  }
}

module.exports = { ScholarshipRepository };

