const { ScholarshipRepository } = require("../repositories/ScholarshipRepository");
const { StudyProgrammeRepository } = require("../repositories/StudyProgrammeRepository");
const { mapPublicScholarship, comparePublicOpportunities } = require("../utils/mapPublicOpportunity");
const { getBookmarkUserId } = require("../middleware/requireStudent");
const {
  initialStatusForCreator,
  nextStatusAfterUpdate,
  assertCanMutateScholarship,
  parseDeadline,
} = require("../usecases/scholarships/scholarshipCrudRules");
const { maybeTranslateScholarship } = require("../services/scholarshipAmharicContent");
const { validateSearchInputs } = require("../usecases/scholarships/searchValidation");
const { parseShuffleSeed } = require("../utils/shuffleSeed");
const { ALLOWED_FIELD_CATEGORIES } = require("../utils/fieldCategory");
const {
  ALLOWED_HOST_REGIONS,
  hostCountriesForRegions,
  hostCountryToRegion,
} = require("../utils/hostRegion");

const repo = new ScholarshipRepository();
const programmeRepo = new StudyProgrammeRepository();

function parseLang(query) {
  const lang = String(query?.lang || "en").toLowerCase();
  return lang === "am" ? "am" : "en";
}

function shouldIncludeProgrammes(query, degreeLevels) {
  if (String(query?.include_programmes || "1") === "0") return false;
  if (!degreeLevels?.length) return true;
  return degreeLevels.some((d) =>
    ["bachelor", "high_school", "master", "phd"].includes(d),
  );
}

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

    await maybeTranslateScholarship(created.id, { awaitResult: true });

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
      hostCountries: filters.hostCountries || [],
      hostRegions: filters.hostRegions || [],
      eligibleRegions: filters.eligibleRegions || [],
      degreeLevels: filters.degreeLevels || [],
      fieldCategories: filters.fieldCategories || filters.fieldsOfStudy || [],
      fieldsOfStudy: filters.fieldCategories || filters.fieldsOfStudy || [],
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

function parseApplicationFilter(value) {
  const normalized = String(value || "all").toLowerCase();
  if (normalized === "applied" || normalized === "not_applied") return normalized;
  return "all";
}

function parseAvailability(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "open" || normalized === "rolling" || normalized === "closing_soon") {
    return normalized;
  }
  return undefined;
}

function resolveHostRegions(query) {
  return normalizeMulti(query.host_region)
    .map((value) => String(value).toLowerCase())
    .filter((value) => ALLOWED_HOST_REGIONS.includes(value));
}

function resolveHostCountries(query) {
  const hostRegions = resolveHostRegions(query);
  if (hostRegions.length) {
    return hostCountriesForRegions(hostRegions);
  }

  const legacyCountries = [
    ...normalizeMulti(query.host_country),
    ...normalizeMulti(query.country),
  ];
  if (legacyCountries.length) {
    const fromLegacyRegions = new Set();
    for (const country of legacyCountries) {
      const region = hostCountryToRegion(country);
      if (region) {
        for (const mapped of hostCountriesForRegions([region])) {
          fromLegacyRegions.add(mapped);
        }
      } else {
        fromLegacyRegions.add(country);
      }
    }
    return [...fromLegacyRegions];
  }

  return [];
}

function resolveFieldCategories(query) {
  const categories = normalizeMulti(query.field_category);
  if (categories.length) return categories;
  return normalizeMulti(query.field_of_study).filter((value) =>
    ALLOWED_FIELD_CATEGORIES.has(String(value).toLowerCase()),
  );
}

const MERGED_SEARCH_FETCH_CAP = 500;

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
      application_filter: applicationFilterRaw,
      availability: availabilityRaw,
      shuffle_seed: shuffleSeedRaw,
    } = req.query;

    const lang = parseLang(req.query);
    const hostRegions = resolveHostRegions(req.query);
    const hostCountries = resolveHostCountries(req.query);
    const fieldCategories = resolveFieldCategories(req.query).map((value) => String(value).toLowerCase());
    const eligibleRegions = normalizeMulti(req.query.eligible_region).map((r) => String(r).toLowerCase());
    const degreeLevels = normalizeMulti(req.query.degree_level);
    const fieldsOfStudy = normalizeMulti(req.query.field_of_study);
    const fundingTypes = normalizeMulti(req.query.funding_type);
    const applicationFilter = parseApplicationFilter(applicationFilterRaw);
    const availability = parseAvailability(availabilityRaw);
    const shuffleSeed = parseShuffleSeed(shuffleSeedRaw);

    const parsedPage = page ? Math.max(parseInt(page, 10), 1) : 1;
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10), 1), 100) : 20;

    const bookmarkUserId = getBookmarkUserId(req);
    const applicationUserId = bookmarkUserId;
    const isPrivileged = req.user && (req.user.role === "owner" || req.user.role === "admin");

    validateSearchInputs({
      sort,
      degreeLevels,
      fundingTypes,
      eligibleRegions,
      hostRegions,
      fieldCategories,
      availability,
      deadlineFrom,
      deadlineTo,
      status,
      applicationFilter,
      isPrivileged,
    });

    if (applicationFilter !== "all" && !applicationUserId) {
      const err = new Error("Sign in to filter by application status");
      err.statusCode = 401;
      throw err;
    }

    const includeProgrammes =
      shouldIncludeProgrammes(req.query, degreeLevels) &&
      applicationFilter !== "applied" &&
      !availability &&
      !eligibleRegions.length;

    const searchArgs = {
      q,
      hostCountries,
      eligibleRegions,
      availability,
      degreeLevels,
      fieldCategories,
      fieldsOfStudy: fieldCategories.length ? undefined : fieldsOfStudy,
      fundingTypes,
      deadlineFrom,
      deadlineTo,
      sort,
      status: isPrivileged ? status : undefined,
      bookmarkUserId,
      applicationFilter,
      applicationUserId,
      shuffleSeed,
    };

    if (!includeProgrammes) {
      const scholarshipResult = await repo.searchPublic({
        ...searchArgs,
        page: parsedPage,
        limit: parsedLimit,
      });

      return res.json({
        results: scholarshipResult.results.map((r) => mapPublicScholarship(r, lang)),
        total: scholarshipResult.total,
        page: parsedPage,
        limit: parsedLimit,
        lang,
      });
    }

    const fetchLimit = Math.min(parsedPage * parsedLimit, MERGED_SEARCH_FETCH_CAP);
    const scholarshipResult = await repo.searchPublic({
      ...searchArgs,
      page: 1,
      limit: fetchLimit,
    });
    const programmeSearch = await programmeRepo.searchPublic({
      q,
      hostCountries,
      degreeLevels,
      fieldCategories,
      fundingTypes: fundingTypes.length ? fundingTypes : undefined,
      availability,
      sort,
      page: 1,
      limit: fetchLimit,
      lang,
      shuffleSeed,
    });

    const scholarshipRows = scholarshipResult.results.map((r) => mapPublicScholarship(r, lang));
    const merged = [...scholarshipRows, ...programmeSearch.results].sort((a, b) =>
      comparePublicOpportunities(a, b, sort, q, shuffleSeed || "browse-default"),
    );
    const offset = (parsedPage - 1) * parsedLimit;

    return res.json({
      results: merged.slice(offset, offset + parsedLimit),
      total: scholarshipResult.total + programmeSearch.total,
      page: parsedPage,
      limit: parsedLimit,
      lang,
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
      const lang = parseLang(req.query);
      const programme = await programmeRepo.findPublicById(id, { lang });
      if (programme) {
        return res.json(programme);
      }
      const err = new Error("Scholarship not found");
      err.statusCode = 404;
      throw err;
    }

    const lang = parseLang(req.query);
    return res.json({
      ...mapPublicScholarship(row, lang),
      createdAt: row.created_at,
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

