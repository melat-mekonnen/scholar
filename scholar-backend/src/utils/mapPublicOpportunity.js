/**
 * Resolve localized title/description for API responses.
 */
const { compareShuffledIds } = require("./shuffleSeed");
function resolveLangContent(row, lang = "en") {
  const useAm = String(lang || "en").toLowerCase() === "am";
  return {
    title: useAm && row.title_am ? row.title_am : row.title,
    description: useAm && row.description_am ? row.description_am : row.description,
    organizationName:
      useAm && row.organization_name_am ? row.organization_name_am : row.organization_name,
    country: useAm && row.country_am ? row.country_am : row.country,
    hostCountry: useAm && row.host_country_am ? row.host_country_am : row.host_country,
    fieldOfStudy: useAm && row.field_of_study_am ? row.field_of_study_am : row.field_of_study,
    titleEn: row.title,
    titleAm: row.title_am || null,
    descriptionEn: row.description,
    descriptionAm: row.description_am || null,
    organizationNameEn: row.organization_name || null,
    organizationNameAm: row.organization_name_am || null,
    countryEn: row.country || null,
    countryAm: row.country_am || null,
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
    qualityScore: row.quality_score,
  };
}

function parseTime(value) {
  if (!value) return null;
  const time = new Date(String(value)).getTime();
  return Number.isNaN(time) ? null : time;
}

function titleMatchesQuery(title, q) {
  if (!q) return false;
  return String(title || "").toLowerCase().includes(String(q).toLowerCase());
}

function comparePublicOpportunities(a, b, sort = "relevance", q = "", shuffleSeed = "") {
  const left = a || {};
  const right = b || {};
  const effectiveSort = sort || "relevance";

  switch (effectiveSort) {
    case "deadline_asc": {
      const leftDeadline = parseTime(left.deadline);
      const rightDeadline = parseTime(right.deadline);
      if (leftDeadline == null && rightDeadline != null) return 1;
      if (leftDeadline != null && rightDeadline == null) return -1;
      if (leftDeadline != null && rightDeadline != null && leftDeadline !== rightDeadline) {
        return leftDeadline - rightDeadline;
      }
      break;
    }
    case "deadline_desc": {
      const leftDeadline = parseTime(left.deadline);
      const rightDeadline = parseTime(right.deadline);
      if (leftDeadline == null && rightDeadline != null) return 1;
      if (leftDeadline != null && rightDeadline == null) return -1;
      if (leftDeadline != null && rightDeadline != null && leftDeadline !== rightDeadline) {
        return rightDeadline - leftDeadline;
      }
      break;
    }
    case "recent": {
      const leftRecent = parseTime(left.createdAt || left.updatedAt) || 0;
      const rightRecent = parseTime(right.createdAt || right.updatedAt) || 0;
      if (leftRecent !== rightRecent) return rightRecent - leftRecent;
      break;
    }
    case "funding_amount": {
      const amountCompare = String(right.amount || "").localeCompare(String(left.amount || ""));
      if (amountCompare !== 0) return amountCompare;
      break;
    }
    case "relevance":
    default:
      if (q) {
        const leftRank = titleMatchesQuery(left.title, q) ? 0 : 1;
        const rightRank = titleMatchesQuery(right.title, q) ? 0 : 1;
        if (leftRank !== rightRank) return leftRank - rightRank;
      } else {
        const leftWeight = String(left.title || "").toLowerCase().startsWith("commonwealth") ? 1 : 0;
        const rightWeight = String(right.title || "").toLowerCase().startsWith("commonwealth") ? 1 : 0;
        if (leftWeight !== rightWeight) return leftWeight - rightWeight;
        return compareShuffledIds(left.id, right.id, shuffleSeed || "browse-default");
      }
      {
        const leftRecent = parseTime(left.createdAt || left.updatedAt) || 0;
        const rightRecent = parseTime(right.createdAt || right.updatedAt) || 0;
        if (leftRecent !== rightRecent) return rightRecent - leftRecent;
      }
      break;
  }

  return String(left.title || "").localeCompare(String(right.title || ""));
}

module.exports = {
  resolveLangContent,
  mapPublicScholarship,
  comparePublicOpportunities,
};
