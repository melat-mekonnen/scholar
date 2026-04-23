const { ScholarshipRepository } = require("../repositories/ScholarshipRepository");
const { getBookmarkUserId } = require("../middleware/requireStudent");
const {
  initialStatusForCreator,
  nextStatusAfterUpdate,
  assertCanMutateScholarship,
  parseDeadline,
} = require("../usecases/scholarships/scholarshipCrudRules");

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
    if (!req.user || !["manager", "owner", "admin"].includes(req.user.role)) {
      const err = new Error("Manager, owner, or admin access required");
      err.statusCode = 403;
      throw err;
    }
    const {
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
    } = req.body || {};

    if (!title || !title.trim()) {
      const err = new Error("Title is required");
      err.statusCode = 400;
      throw err;
    }
    if (!organizationName || !organizationName.trim()) {
      const err = new Error("Organization is required");
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
    const parsedDeadline = parseDeadline(deadline, { required: true });
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

    const created = await repo.createScholarship({
      title: title.trim(),
      organizationName: organizationName.trim(),
      country: country.trim(),
      degreeLevel: degreeLevel.trim(),
      fieldOfStudy: fieldOfStudy.trim(),
      fundingType: fundingType.trim(),
      deadline: parsedDeadline,
      applicationStartDate: applicationStartDate || null,
      applicationEndDate: applicationEndDate || null,
      amount: amount ? String(amount).trim() : null,
      description: description.trim(),
      applicationUrl: applicationUrl ? applicationUrl.trim() : null,
      postedByUserId: req.user.id,
      status: initialStatusForCreator(req.user.role),
    });

    return res.status(201).json({
      id: created.id,
      title: created.title,
      organizationName: created.organization_name,
      country: created.country,
      degreeLevel: created.degree_level,
      fieldOfStudy: created.field_of_study,
      fundingType: created.funding_type,
      deadline: created.deadline,
      startDate: created.application_start_date,
      endDate: created.application_end_date,
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

async function list(req, res, next) {
  try {
    await repo.expirePastDeadline();
    const result = await search(req, { json: (payload) => payload }, next);
    return res.json(result);
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
    await repo.expirePastDeadline();
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

    const isPrivileged = req.user && (req.user.role === "owner" || req.user.role === "admin");
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
      status: isPrivileged ? status : undefined,
      bookmarkUserId,
    });

    return res.json({
      results: result.results.map((r) => ({
        id: r.id,
        title: r.title,
        organizationName: r.organization_name,
        country: r.country,
        degreeLevel: r.degree_level,
        fieldOfStudy: r.field_of_study,
        fundingType: r.funding_type,
        deadline: r.deadline,
        startDate: r.application_start_date,
        endDate: r.application_end_date,
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
    await repo.expirePastDeadline();
    const { id } = req.params;
    if (!id || !UUID_V4.test(id)) {
      const err = new Error("Invalid scholarship id");
      err.statusCode = 400;
      throw err;
    }

    const bookmarkUserId = getBookmarkUserId(req);

    const row = await repo.findPublicById(id, { bookmarkUserId });
    if (!row && req.user && ["manager", "owner", "admin"].includes(req.user.role)) {
      const anyRow = await repo.findById(id);
      if (anyRow) {
        if (
          req.user.role === "owner" ||
          req.user.role === "admin" ||
          String(anyRow.posted_by_user_id) === String(req.user.id)
        ) {
          return res.json({
            id: anyRow.id,
            title: anyRow.title,
            organizationName: anyRow.organization_name,
            country: anyRow.country,
            degreeLevel: anyRow.degree_level,
            fieldOfStudy: anyRow.field_of_study,
            fundingType: anyRow.funding_type,
            deadline: anyRow.deadline,
            startDate: anyRow.application_start_date,
            endDate: anyRow.application_end_date,
            amount: anyRow.amount,
            description: anyRow.description,
            applicationUrl: anyRow.application_url,
            status: anyRow.status,
            rejectionReason: anyRow.rejection_reason,
            createdAt: anyRow.created_at,
          });
        }
      }
    }
    if (!row) {
      const err = new Error("Scholarship not found");
      err.statusCode = 404;
      throw err;
    }

    return res.json({
      id: row.id,
      title: row.title,
      organizationName: row.organization_name,
      country: row.country,
      degreeLevel: row.degree_level,
      fieldOfStudy: row.field_of_study,
      fundingType: row.funding_type,
      deadline: row.deadline,
      startDate: row.application_start_date,
      endDate: row.application_end_date,
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

async function update(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || !UUID_V4.test(id)) {
      const err = new Error("Invalid scholarship id");
      err.statusCode = 400;
      throw err;
    }
    const current = await repo.findById(id);
    if (!current) {
      const err = new Error("Scholarship not found");
      err.statusCode = 404;
      throw err;
    }
    assertCanMutateScholarship(req.user, current);

    const patch = {};
    const body = req.body || {};
    if (body.title != null) {
      if (!String(body.title).trim()) {
        const err = new Error("Title cannot be empty");
        err.statusCode = 400;
        throw err;
      }
      patch.title = String(body.title).trim();
    }
    if (body.organizationName != null) {
      if (!String(body.organizationName).trim()) {
        const err = new Error("Organization cannot be empty");
        err.statusCode = 400;
        throw err;
      }
      patch.organizationName = String(body.organizationName).trim();
    }
    if (body.country != null) patch.country = String(body.country).trim();
    if (body.degreeLevel != null) patch.degreeLevel = String(body.degreeLevel).trim();
    if (body.fieldOfStudy != null) patch.fieldOfStudy = String(body.fieldOfStudy).trim();
    if (body.fundingType != null) patch.fundingType = String(body.fundingType).trim();
    if (body.deadline != null) patch.deadline = parseDeadline(body.deadline, { required: true });
    if (body.applicationStartDate != null) patch.applicationStartDate = body.applicationStartDate || null;
    if (body.applicationEndDate != null) patch.applicationEndDate = body.applicationEndDate || null;
    if (body.amount != null) patch.amount = String(body.amount).trim();
    if (body.description != null) patch.description = String(body.description).trim();
    if (body.applicationUrl != null) {
      const v = String(body.applicationUrl).trim();
      if (v && !isValidUrl(v)) {
        const err = new Error("Valid application URL is required");
        err.statusCode = 400;
        throw err;
      }
      patch.applicationUrl = v || null;
    }
    patch.status = nextStatusAfterUpdate(req.user.role);
    patch.rejectionReason = null;

    const updated = await repo.updateScholarshipById(id, patch);
    return res.json({
      id: updated.id,
      title: updated.title,
      organizationName: updated.organization_name,
      country: updated.country,
      degreeLevel: updated.degree_level,
      fieldOfStudy: updated.field_of_study,
      fundingType: updated.funding_type,
      deadline: updated.deadline,
      startDate: updated.application_start_date,
      endDate: updated.application_end_date,
      amount: updated.amount,
      description: updated.description,
      applicationUrl: updated.application_url,
      status: updated.status,
      rejectionReason: updated.rejection_reason,
      postedByUserId: updated.posted_by_user_id,
      updatedAt: updated.updated_at,
    });
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || !UUID_V4.test(id)) {
      const err = new Error("Invalid scholarship id");
      err.statusCode = 400;
      throw err;
    }
    const current = await repo.findById(id);
    if (!current) {
      const err = new Error("Scholarship not found");
      err.statusCode = 404;
      throw err;
    }
    assertCanMutateScholarship(req.user, current);
    await repo.deleteScholarshipCascade(id);
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function myScholarships(req, res, next) {
  try {
    if (!req.user || req.user.role !== "manager") {
      const err = new Error("Manager access required");
      err.statusCode = 403;
      throw err;
    }
    await repo.expirePastDeadline();
    const parsedPage = req.query?.page ? Math.max(parseInt(req.query.page, 10), 1) : 1;
    const parsedPageSize = req.query?.pageSize
      ? Math.min(Math.max(parseInt(req.query.pageSize, 10), 1), 100)
      : 20;

    const data = await repo.listMine({
      userId: req.user.id,
      page: parsedPage,
      pageSize: parsedPageSize,
      search: req.query?.search,
      status: req.query?.status,
    });

    return res.json({
      scholarships: data.scholarships.map((r) => ({
        id: r.id,
        title: r.title,
        organizationName: r.organization_name,
        country: r.country,
        degreeLevel: r.degree_level,
        fundingType: r.funding_type,
        deadline: r.deadline,
        startDate: r.application_start_date,
        endDate: r.application_end_date,
        status: r.status,
        rejectionReason: r.rejection_reason,
        createdAt: r.created_at,
      })),
      total: data.total,
      page: data.page,
      pageSize: data.pageSize,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
  list,
  getFilters,
  search,
  getById,
  update,
  remove,
  myScholarships,
};

