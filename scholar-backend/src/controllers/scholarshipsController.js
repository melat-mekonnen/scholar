const { ScholarshipRepository } = require("../repositories/ScholarshipRepository");
const { getBookmarkUserId } = require("../middleware/requireStudent");

const repo = new ScholarshipRepository();

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (_err) {
    return false;
  }
}

async function create(req, res, next) {
  try {
    const {
      title,
      country,
      degreeLevel,
      fieldOfStudy,
      fundingType,
      deadline,
      amount,
      description,
      applicationUrl,
    } = req.body || {};

    if (!title || !title.trim()) {
      const err = new Error("Title is required");
      err.statusCode = 400;
      throw err;
    }
    if (!country || !country.trim()) {
      const err = new Error("Country is required");
      err.statusCode = 400;
      throw err;
    }
    if (!degreeLevel || !degreeLevel.trim()) {
      const err = new Error("Degree level is required");
      err.statusCode = 400;
      throw err;
    }
    if (!fieldOfStudy || !fieldOfStudy.trim()) {
      const err = new Error("Field of study is required");
      err.statusCode = 400;
      throw err;
    }
    if (!fundingType || !fundingType.trim()) {
      const err = new Error("Funding type is required");
      err.statusCode = 400;
      throw err;
    }
    if (!deadline) {
      const err = new Error("Deadline is required");
      err.statusCode = 400;
      throw err;
    }
    const parsedDeadline = new Date(deadline);
    if (Number.isNaN(parsedDeadline.getTime())) {
      const err = new Error("Deadline must be a valid date");
      err.statusCode = 400;
      throw err;
    }
    if (!description || !description.trim()) {
      const err = new Error("Description is required");
      err.statusCode = 400;
      throw err;
    }
    if (applicationUrl && !isValidUrl(applicationUrl)) {
      const err = new Error("Valid application URL is required");
      err.statusCode = 400;
      throw err;
    }

    const created = await repo.createByManager({
      title: title.trim(),
      country: country.trim(),
      degreeLevel: degreeLevel.trim(),
      fieldOfStudy: fieldOfStudy.trim(),
      fundingType: fundingType.trim(),
      deadline: parsedDeadline.toISOString().slice(0, 10),
      amount: amount ? String(amount).trim() : null,
      description: description.trim(),
      applicationUrl: applicationUrl ? applicationUrl.trim() : null,
      postedByUserId: req.user.id,
    });

    return res.status(201).json({
      id: created.id,
      title: created.title,
      country: created.country,
      degreeLevel: created.degree_level,
      fieldOfStudy: created.field_of_study,
      fundingType: created.funding_type,
      deadline: created.deadline,
      amount: created.amount,
      description: created.description,
      applicationUrl: created.application_url,
      status: created.status,
      postedByUserId: created.posted_by_user_id,
      createdAt: created.created_at,
    });
  } catch (err) {
    return next(err);
  }
}

async function getFilters(req, res, next) {
  try {
    const filters = await repo.getPublicFilters();
    return res.json({
      countries: filters.countries || [],
      degreeLevels: filters.degreeLevels || [],
      fieldsOfStudy: filters.fieldsOfStudy || [],
      fundingTypes: filters.fundingTypes || [],
    });
  } catch (err) {
    return next(err);
  }
}

function normalizeMulti(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

async function search(req, res, next) {
  try {
    const {
      q,
      deadline_from: deadlineFrom,
      deadline_to: deadlineTo,
      sort,
      page,
      limit,
      status,
    } = req.query;

    const countries = normalizeMulti(req.query.country);
    const degreeLevels = normalizeMulti(req.query.degree_level);
    const fieldsOfStudy = normalizeMulti(req.query.field_of_study);
    const fundingTypes = normalizeMulti(req.query.funding_type);

    const parsedPage = page ? Math.max(parseInt(page, 10), 1) : 1;
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10), 1), 100) : 20;

    const bookmarkUserId = getBookmarkUserId(req);

    const result = await repo.searchPublic({
      q,
      countries,
      degreeLevels,
      fieldsOfStudy,
      fundingTypes,
      deadlineFrom,
      deadlineTo,
      sort,
      page: parsedPage,
      limit: parsedLimit,
      status,
      bookmarkUserId,
    });

    return res.json({
      results: result.results.map((r) => ({
        id: r.id,
        title: r.title,
        country: r.country,
        degreeLevel: r.degree_level,
        fieldOfStudy: r.field_of_study,
        fundingType: r.funding_type,
        deadline: r.deadline,
        amount: r.amount,
        applicationUrl: r.application_url,
        bookmark_count: r.bookmark_count,
        bookmarkCount: r.bookmark_count,
        is_bookmarked: Boolean(r.is_bookmarked),
        isBookmarked: Boolean(r.is_bookmarked),
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  }
  catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || !UUID_V4.test(id)) {
      const err = new Error("Invalid scholarship id");
      err.statusCode = 400;
      throw err;
    }

    const bookmarkUserId = getBookmarkUserId(req);

    const row = await repo.findPublicById(id, { bookmarkUserId });
    if (!row) {
      const err = new Error("Scholarship not found");
      err.statusCode = 404;
      throw err;
    }

    return res.json({
      id: row.id,
      title: row.title,
      country: row.country,
      degreeLevel: row.degree_level,
      fieldOfStudy: row.field_of_study,
      fundingType: row.funding_type,
      deadline: row.deadline,
      amount: row.amount,
      description: row.description,
      applicationUrl: row.application_url,
      createdAt: row.created_at,
      bookmark_count: row.bookmark_count,
      bookmarkCount: row.bookmark_count,
      is_bookmarked: Boolean(row.is_bookmarked),
      isBookmarked: Boolean(row.is_bookmarked),
      postedBy: row.posted_by_id
        ? { id: row.posted_by_id, fullName: row.posted_by_full_name }
        : null,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
  getFilters,
  search,
  getById,
};

