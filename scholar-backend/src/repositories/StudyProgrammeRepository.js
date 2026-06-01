const { query } = require("../infra/db/neonClient");
const { resolveApplicationDates } = require("../utils/resolveApplicationDates");
const { normalizeUrl } = require("../modules/scholarship-ingestion/urlNormalize");
const {
  isValidStudyProgrammeListing,
  studyProgrammeNotHubSql,
} = require("../utils/studyProgrammeHubGuard");

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
    if (!isValidStudyProgrammeListing({ title, sourceUrl, applicationUrl })) {
      return null;
    }
    const normalizedSourceUrl = normalizeUrl(sourceUrl || applicationUrl);
    const result = await query(
      `INSERT INTO study_programmes (
         title, title_am, organization_name, country, host_country,
         degree_level, field_of_study, funding_type,
         programme_start_date, application_start_date, application_end_date, deadline,
         amount, description, description_am, extracted_facts,
         application_url, source_url, external_id, status, is_rolling,
         quality_score, normalized_source_url
       )
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       ON CONFLICT (source_url) WHERE source_url IS NOT NULL AND source_url <> ''
       DO UPDATE SET
         title = EXCLUDED.title,
         title_am = COALESCE(EXCLUDED.title_am, study_programmes.title_am),
         organization_name = EXCLUDED.organization_name,
         country = EXCLUDED.country,
         host_country = COALESCE(EXCLUDED.host_country, study_programmes.host_country),
         degree_level = EXCLUDED.degree_level,
         field_of_study = EXCLUDED.field_of_study,
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
    countries,
    degreeLevels,
    fieldsOfStudy,
    fundingTypes,
    page = 1,
    limit = 20,
    lang = "en",
  }) {
    const where = [`p.status = 'verified'`, studyProgrammeNotHubSql("p")];
    const params = [];

    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      const p = `$${params.length}`;
      where.push(
        `(LOWER(p.title) LIKE ${p} OR LOWER(COALESCE(p.title_am, '')) LIKE ${p} OR LOWER(p.country) LIKE ${p} OR LOWER(COALESCE(p.field_of_study, '')) LIKE ${p})`,
      );
    }

    if (countries?.length) {
      params.push(countries);
      where.push(`p.country = ANY($${params.length})`);
    }

    if (degreeLevels?.length) {
      params.push(degreeLevels);
      where.push(`p.degree_level = ANY($${params.length})`);
    }

    if (fieldsOfStudy?.length) {
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
    const listParams = [...params, limit, offset];

    const listResult = await query(
      `SELECT p.*
       FROM study_programmes p
       ${whereClause}
       ORDER BY p.updated_at DESC
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
    const useAm = lang === "am";
    const resolvedDates = resolveApplicationDates({
      title: row.title,
      description: row.description,
      recordType: "study_programme",
      degreeLevel: row.degree_level,
      applicationStartDate: row.application_start_date,
      applicationEndDate: row.application_end_date,
      deadline: row.deadline,
      programmeStartDate: row.programme_start_date,
      isRolling: row.is_rolling,
    });
    return {
      id: row.id,
      recordType: "study_programme",
      title: useAm && row.title_am ? row.title_am : row.title,
      titleEn: row.title,
      titleAm: row.title_am,
      organizationName: row.organization_name,
      country: row.country,
      hostCountry: row.host_country,
      degreeLevel: row.degree_level,
      fieldOfStudy: row.field_of_study,
      fundingType: row.funding_type,
      deadline: resolvedDates.deadline,
      startDate: resolvedDates.applicationStartDate,
      endDate: resolvedDates.applicationEndDate,
      programmeStartDate: row.programme_start_date,
      amount: row.amount,
      description: useAm && row.description_am ? row.description_am : row.description,
      descriptionEn: row.description,
      descriptionAm: row.description_am,
      applicationUrl: row.application_url,
      isRolling: resolvedDates.isRolling,
    };
  }

  async findPublicById(id, { lang = "en" } = {}) {
    const result = await query(
      `SELECT * FROM study_programmes p
       WHERE p.id = $1 AND p.status = 'verified' AND ${studyProgrammeNotHubSql("p")}`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.mapPublicRow(row, lang);
  }
}

module.exports = { StudyProgrammeRepository };
