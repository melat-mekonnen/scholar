const { query } = require("../infra/db/neonClient");
const { normalizeUrl } = require("../modules/scholarship-ingestion/urlNormalize");
const { resolveFieldCategory } = require("../utils/fieldCategory");
const { resolveLangContent } = require("../utils/mapPublicOpportunity");

class StudyProgrammeRepository {
  async upsertProgramme({
    title,
    titleAm,
    organizationName,
    country,
    hostCountry,
    degreeLevel,
    fieldOfStudy,
    fundingType = "not_funded",
    programmeStartDate,
    applicationStartDate,
    applicationEndDate,
    deadline,
    amount,
    description,
    descriptionAm,
    extractedFacts,
    applicationUrl,
    sourceUrl,
    externalId,
    status = "verified",
    isRolling = false,
    qualityScore = null,
  }) {
    const normalizedSourceUrl = normalizeUrl(sourceUrl || applicationUrl);
    const fieldCategory = resolveFieldCategory({ fieldOfStudy, title, degreeLevel });
    const result = await query(
      `INSERT INTO study_programmes (
         title, title_am, organization_name, country, host_country,
         degree_level, field_of_study, field_category, funding_type,
         programme_start_date, application_start_date, application_end_date, deadline,
         amount, description, description_am, extracted_facts,
         application_url, source_url, external_id, status, is_rolling,
         quality_score, normalized_source_url
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       ON CONFLICT (source_url) WHERE source_url IS NOT NULL AND source_url <> ''
       DO UPDATE SET
         title = EXCLUDED.title,
         title_am = COALESCE(EXCLUDED.title_am, study_programmes.title_am),
         organization_name = EXCLUDED.organization_name,
         organization_name_am = COALESCE(EXCLUDED.organization_name_am, study_programmes.organization_name_am),
         country = EXCLUDED.country,
         country_am = COALESCE(EXCLUDED.country_am, study_programmes.country_am),
         host_country = COALESCE(EXCLUDED.host_country, study_programmes.host_country),
         host_country_am = COALESCE(EXCLUDED.host_country_am, study_programmes.host_country_am),
         degree_level = EXCLUDED.degree_level,
         field_of_study = EXCLUDED.field_of_study,
         field_of_study_am = COALESCE(EXCLUDED.field_of_study_am, study_programmes.field_of_study_am),
         field_category = EXCLUDED.field_category,
         funding_type = EXCLUDED.funding_type,
         programme_start_date = EXCLUDED.programme_start_date,
         application_start_date = EXCLUDED.application_start_date,
         application_end_date = EXCLUDED.application_end_date,
         deadline = EXCLUDED.deadline,
         amount = EXCLUDED.amount,
         description = EXCLUDED.description,
         description_am = COALESCE(EXCLUDED.description_am, study_programmes.description_am),
         extracted_facts = COALESCE(EXCLUDED.extracted_facts, study_programmes.extracted_facts),
         application_url = EXCLUDED.application_url,
         external_id = COALESCE(EXCLUDED.external_id, study_programmes.external_id),
         status = EXCLUDED.status,
         is_rolling = EXCLUDED.is_rolling OR study_programmes.is_rolling,
         quality_score = COALESCE(EXCLUDED.quality_score, study_programmes.quality_score),
         normalized_source_url = COALESCE(EXCLUDED.normalized_source_url, study_programmes.normalized_source_url),
         updated_at = NOW()
       RETURNING *`,
      [
        title,
        titleAm || null,
        organizationName || null,
        country,
        hostCountry || country,
        degreeLevel || null,
        fieldOfStudy || null,
        fieldCategory,
        fundingType,
        programmeStartDate || null,
        applicationStartDate || null,
        applicationEndDate || null,
        deadline || null,
        amount || null,
        description,
        descriptionAm || null,
        extractedFacts ? JSON.stringify(extractedFacts) : null,
        applicationUrl,
        sourceUrl,
        externalId || null,
        status,
        isRolling,
        qualityScore,
        normalizedSourceUrl,
      ],
    );
    return result.rows[0];
  }

  async linkToScholarship(programmeId, scholarshipId, linkType = "related") {
    await query(
      `INSERT INTO programme_scholarships (programme_id, scholarship_id, link_type)
       VALUES ($1, $2, $3)
       ON CONFLICT (programme_id, scholarship_id) DO NOTHING`,
      [programmeId, scholarshipId, linkType],
    );
  }

  async searchPublic({
    q,
    hostCountries,
    degreeLevels,
    fieldCategories,
    fieldsOfStudy,
    fundingTypes,
    availability,
    sort,
    page = 1,
    limit = 20,
    lang = "en",
    shuffleSeed,
  }) {
    const where = [`p.status = 'verified'`];
    const params = [];

    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      const p = `$${params.length}`;
      where.push(
        `(LOWER(p.title) LIKE ${p} OR LOWER(COALESCE(p.title_am, '')) LIKE ${p} OR LOWER(p.country) LIKE ${p} OR LOWER(COALESCE(p.field_of_study, '')) LIKE ${p})`,
      );
    }

    if (hostCountries?.length) {
      params.push(hostCountries);
      where.push(`COALESCE(p.host_country, p.country) = ANY($${params.length})`);
    }

    if (availability === "rolling") {
      where.push(`p.is_rolling = TRUE`);
    } else if (availability === "open") {
      where.push(`(
        p.is_rolling = TRUE
        OR p.deadline IS NULL
        OR p.deadline >= CURRENT_DATE
      )`);
    } else if (availability === "closing_soon") {
      where.push(`(
        p.deadline IS NOT NULL
        AND p.deadline >= CURRENT_DATE
        AND p.deadline <= CURRENT_DATE + INTERVAL '30 days'
      )`);
    }

    if (degreeLevels?.length) {
      params.push(degreeLevels);
      where.push(`p.degree_level = ANY($${params.length})`);
    }

    if (fieldCategories?.length) {
      params.push(fieldCategories);
      where.push(`p.field_category = ANY($${params.length})`);
    } else if (fieldsOfStudy?.length) {
      params.push(fieldsOfStudy);
      where.push(`p.field_of_study = ANY($${params.length})`);
    }

    if (fundingTypes?.length) {
      params.push(fundingTypes);
      where.push(`p.funding_type = ANY($${params.length})`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countResult = await query(
      `SELECT COUNT(*) AS total FROM study_programmes p ${whereClause}`,
      params,
    );
    const total = Number(countResult.rows[0]?.total || 0);
    const offset = (page - 1) * limit;

    let orderBy = "ORDER BY p.updated_at DESC";
    switch (sort) {
      case "deadline_asc":
        orderBy = "ORDER BY p.deadline ASC NULLS LAST, p.updated_at DESC";
        break;
      case "deadline_desc":
        orderBy = "ORDER BY p.deadline DESC NULLS LAST, p.updated_at DESC";
        break;
      case "recent":
        orderBy = "ORDER BY p.created_at DESC NULLS LAST, p.updated_at DESC";
        break;
      case "funding_amount":
        orderBy = "ORDER BY p.amount DESC NULLS LAST, p.updated_at DESC";
        break;
      case "relevance":
      default:
        if (q) {
          const qParamIndex = params.findIndex((v) => typeof v === "string" && v === `%${q.toLowerCase()}%`);
          const p = qParamIndex >= 0 ? `$${qParamIndex + 1}` : null;
          if (p) {
            orderBy = `ORDER BY (CASE WHEN LOWER(p.title) LIKE ${p} THEN 0 ELSE 1 END), p.updated_at DESC`;
          }
        } else {
          params.push(shuffleSeed || "browse-default");
          orderBy = `ORDER BY (CASE WHEN p.title ILIKE 'Commonwealth%' THEN 1 ELSE 0 END), md5(p.id::text || $${params.length})`;
        }
        break;
    }

    const listParams = [...params, limit, offset];

    const listResult = await query(
      `SELECT p.*
       FROM study_programmes p
       ${whereClause}
       ${orderBy}
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams,
    );

    return {
      results: listResult.rows.map((r) => this.mapPublicRow(r, lang)),
      total,
      page,
      limit,
    };
  }

  mapPublicRow(row, lang = "en") {
    const localized = resolveLangContent(row, lang);
    return {
      id: row.id,
      recordType: "study_programme",
      title: localized.title,
      titleEn: row.title,
      titleAm: row.title_am,
      organizationName: localized.organizationName,
      organizationNameEn: localized.organizationNameEn,
      organizationNameAm: localized.organizationNameAm,
      country: localized.country,
      countryEn: localized.countryEn,
      countryAm: localized.countryAm,
      hostCountry: localized.hostCountry,
      degreeLevel: row.degree_level,
      fieldOfStudy: localized.fieldOfStudy,
      fieldCategory: row.field_category,
      fundingType: row.funding_type,
      deadline: row.deadline,
      startDate: row.application_start_date,
      endDate: row.application_end_date,
      programmeStartDate: row.programme_start_date,
      amount: row.amount,
      description: localized.description,
      descriptionEn: row.description,
      descriptionAm: row.description_am,
      applicationUrl: row.application_url,
      isRolling: Boolean(row.is_rolling),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findContentForTranslation(id) {
    const result = await query(
      `SELECT id, title, title_am, description, description_am, status,
              organization_name, organization_name_am, country, country_am,
              host_country, host_country_am, field_of_study, field_of_study_am
       FROM study_programmes
       WHERE id = $1
       LIMIT 1`,
      [id],
    );
    return result.rows[0] || null;
  }

  async listForAmharicTranslation({ limit = 50, onlyMissingAm = true } = {}) {
    const where = [`status = 'verified'`];
    if (onlyMissingAm) {
      where.push(`(
        description_am IS NULL OR title_am IS NULL
        OR (organization_name IS NOT NULL AND organization_name <> '' AND organization_name_am IS NULL)
        OR (country IS NOT NULL AND country <> '' AND country_am IS NULL)
        OR (field_of_study IS NOT NULL AND field_of_study <> '' AND field_of_study_am IS NULL)
        OR (
          host_country IS NOT NULL AND host_country <> ''
          AND host_country IS DISTINCT FROM country
          AND host_country_am IS NULL
        )
      )`);
    }

    const result = await query(
      `SELECT id, title
       FROM study_programmes
       WHERE ${where.join(" AND ")}
       ORDER BY updated_at DESC
       LIMIT $1`,
      [limit],
    );
    return result.rows;
  }

  async updateContentFields(id, fields) {
    const result = await query(
      `UPDATE study_programmes
       SET title_am = COALESCE($2, title_am),
           description_am = COALESCE($3, description_am),
           organization_name_am = COALESCE($4, organization_name_am),
           country_am = COALESCE($5, country_am),
           host_country_am = COALESCE($6, host_country_am),
           field_of_study_am = COALESCE($7, field_of_study_am),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, title`,
      [
        id,
        fields.titleAm || null,
        fields.descriptionAm || null,
        fields.organizationNameAm || null,
        fields.countryAm || null,
        fields.hostCountryAm || null,
        fields.fieldOfStudyAm || null,
      ],
    );
    return result.rows[0] || null;
  }

  async findPublicById(id, { lang = "en" } = {}) {
    const result = await query(`SELECT * FROM study_programmes WHERE id = $1 AND status = 'verified'`, [
      id,
    ]);
    const row = result.rows[0];
    if (!row) return null;
    return this.mapPublicRow(row, lang);
  }
}

module.exports = { StudyProgrammeRepository };
