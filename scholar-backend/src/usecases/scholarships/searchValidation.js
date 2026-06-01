const ALLOWED_SORT = new Set([
  "relevance",
  "deadline_asc",
  "deadline_desc",
  "funding_amount",
  "recent",
]);

const ALLOWED_DEGREE_LEVELS = new Set(["high_school", "bachelor", "master", "phd"]);
const ALLOWED_FUNDING_TYPES = new Set(["fully_funded", "partially_funded", "self_funded"]);
const ALLOWED_STATUS = new Set(["all", "draft", "pending", "verified", "rejected", "expired"]);
const {
  isAllowedRegionId,
  isAllowedFieldCategoryId,
} = require("../../utils/scholarshipBrowseFilters");

function ensureDateLike(value, fieldName) {
  if (!value) return;
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    const err = new Error(`${fieldName} must be a valid date`);
    err.statusCode = 400;
    throw err;
  }
}

function validateSearchInputs({
  sort,
  degreeLevels,
  fundingTypes,
  regions,
  fieldCategories,
  deadlineFrom,
  deadlineTo,
  status,
  isPrivileged,
}) {
  if (sort && !ALLOWED_SORT.has(String(sort))) {
    const err = new Error("Invalid sort value");
    err.statusCode = 400;
    throw err;
  }

  for (const d of degreeLevels || []) {
    if (!ALLOWED_DEGREE_LEVELS.has(String(d))) {
      const err = new Error("Invalid degree_level filter value");
      err.statusCode = 400;
      throw err;
    }
  }

  for (const f of fundingTypes || []) {
    if (!ALLOWED_FUNDING_TYPES.has(String(f))) {
      const err = new Error("Invalid funding_type filter value");
      err.statusCode = 400;
      throw err;
    }
  }

  for (const r of regions || []) {
    if (!isAllowedRegionId(String(r))) {
      const err = new Error("Invalid region filter value");
      err.statusCode = 400;
      throw err;
    }
  }

  for (const c of fieldCategories || []) {
    if (!isAllowedFieldCategoryId(String(c))) {
      const err = new Error("Invalid field_category filter value");
      err.statusCode = 400;
      throw err;
    }
  }

  ensureDateLike(deadlineFrom, "deadline_from");
  ensureDateLike(deadlineTo, "deadline_to");
  if (deadlineFrom && deadlineTo) {
    const from = new Date(String(deadlineFrom));
    const to = new Date(String(deadlineTo));
    if (from > to) {
      const err = new Error("Invalid date range: deadline_from cannot be after deadline_to");
      err.statusCode = 400;
      throw err;
    }
  }

  if (status != null && status !== "") {
    if (!ALLOWED_STATUS.has(String(status))) {
      const err = new Error("Invalid status filter value");
      err.statusCode = 400;
      throw err;
    }
    if (!isPrivileged && String(status) !== "verified") {
      const err = new Error("Only verified status is allowed for this role");
      err.statusCode = 400;
      throw err;
    }
  }
}

module.exports = {
  validateSearchInputs,
};
