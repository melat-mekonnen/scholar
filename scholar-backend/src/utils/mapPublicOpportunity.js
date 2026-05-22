/**
 * Resolve localized title/description for API responses.
 */
function resolveLangContent(row, lang = "en") {
  const useAm = String(lang || "en").toLowerCase() === "am";
  return {
    title: useAm && row.title_am ? row.title_am : row.title,
    description: useAm && row.description_am ? row.description_am : row.description,
    titleEn: row.title,
    titleAm: row.title_am || null,
    descriptionEn: row.description,
    descriptionAm: row.description_am || null,
  };
}

function mapPublicScholarship(row, lang = "en") {
  const localized = resolveLangContent(row, lang);
  return {
    id: row.id,
    recordType: row.record_type || "scholarship",
    title: localized.title,
    titleEn: localized.titleEn,
    titleAm: localized.titleAm,
    organizationName: row.organization_name,
    country: row.country,
    hostCountry: row.host_country,
    degreeLevel: row.degree_level,
    fieldOfStudy: row.field_of_study,
    fundingType: row.funding_type,
    deadline: row.deadline,
    startDate: row.application_start_date,
    endDate: row.application_end_date,
    amount: row.amount,
    description: localized.description,
    descriptionEn: localized.descriptionEn,
    descriptionAm: localized.descriptionAm,
    applicationUrl: row.application_url,
    applicationStatus: row.application_status,
    isRolling: Boolean(row.is_rolling),
    is_rolling: Boolean(row.is_rolling),
    bookmark_count: row.bookmark_count,
    bookmarkCount: row.bookmark_count,
    is_bookmarked: Boolean(row.is_bookmarked),
    isBookmarked: Boolean(row.is_bookmarked),
    createdAt: row.created_at,
  };
}

module.exports = {
  resolveLangContent,
  mapPublicScholarship,
};
