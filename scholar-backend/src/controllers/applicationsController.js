const { ApplicationRepository } = require("../repositories/ApplicationRepository");
const { ScholarshipRepository } = require("../repositories/ScholarshipRepository");
const { UserActivityRepository } = require("../repositories/UserActivityRepository");
const { resolveLangContent } = require("../utils/mapPublicOpportunity");

const repo = new ApplicationRepository();
const scholarshipRepo = new ScholarshipRepository();
const activityRepo = new UserActivityRepository();

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_STATUS = new Set(["pending", "submitted", "accepted", "rejected"]);

function parseLang(query) {
  const lang = String(query?.lang || "en").toLowerCase();
  return lang === "am" ? "am" : "en";
}

function mapApplicationScholarship(row, lang = "en") {
  const localized = resolveLangContent(
    {
      title: row.scholarship_title,
      title_am: row.scholarship_title_am,
      description: null,
      description_am: row.scholarship_description_am,
      organization_name: row.scholarship_organization_name,
      organization_name_am: row.scholarship_organization_name_am,
      country: row.scholarship_country,
      country_am: row.scholarship_country_am,
      field_of_study: row.scholarship_field_of_study,
      field_of_study_am: row.scholarship_field_of_study_am,
    },
    lang,
  );
  return {
    title: localized.title,
    organizationName: localized.organizationName,
    country: localized.country,
    fieldOfStudy: localized.fieldOfStudy,
    startDate: row.scholarship_start_date,
    endDate: row.scholarship_end_date,
    deadline: row.scholarship_deadline,
    applicationUrl: row.scholarship_application_url,
  };
}

async function create(req, res, next) {
  try {
    const userId = req.user?.id;
    const scholarshipId = String(req.body?.scholarshipId || "");
    const status = req.body?.status ? String(req.body.status) : "pending";

    if (!UUID_V4.test(scholarshipId)) {
      const err = new Error("Invalid scholarship id");
      err.statusCode = 400;
      throw err;
    }
    if (!ALLOWED_STATUS.has(status)) {
      const err = new Error("Invalid application status");
      err.statusCode = 400;
      throw err;
    }

    const eligible = await repo.findEligibleScholarshipById(scholarshipId);
    if (!eligible) {
      const err = new Error("Scholarship not found or not eligible for applications");
      err.statusCode = 404;
      throw err;
    }
    const scholarship = await scholarshipRepo.findPublicById(scholarshipId);

    const existing = await repo.findByUserAndScholarship(userId, scholarshipId);
    if (existing) {
      if (existing.status === "pending") {
        return res.status(200).json({
          id: existing.id,
          userId: existing.user_id,
          scholarshipId: existing.scholarship_id,
          status: existing.status,
          createdAt: existing.created_at,
          updatedAt: existing.updated_at,
          existing: true,
        });
      }
      return res.status(409).json({ message: "Application already exists for this scholarship" });
    }

    const created = await repo.create({
      userId,
      scholarshipId,
      status,
    });

    const title = scholarship?.title || "scholarship";
    const activityLabel =
      status === "submitted"
        ? `Submitted application: ${title}`
        : `Started application: ${title}`;
    void activityRepo.record(userId, activityLabel).catch(() => {});

    return res.status(201).json({
      id: created.id,
      userId: created.user_id,
      scholarshipId: created.scholarship_id,
      status: created.status,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    });
  } catch (err) {
    return next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const userId = req.user?.id;
    const lang = parseLang(req.query);
    const rows = await repo.listByUserId(userId);
    return res.json({
      applications: rows.map((a) => ({
        id: a.id,
        userId: a.user_id,
        scholarshipId: a.scholarship_id,
        status: a.status,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        scholarship: mapApplicationScholarship(a, lang),
      })),
    });
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const userId = req.user?.id;
    const applicationId = String(req.params?.id || "");
    const status = String(req.body?.status || "");

    if (!UUID_V4.test(applicationId)) {
      const err = new Error("Invalid application id");
      err.statusCode = 400;
      throw err;
    }
    if (!ALLOWED_STATUS.has(status)) {
      const err = new Error("Invalid application status");
      err.statusCode = 400;
      throw err;
    }

    const existing = await repo.findByIdAndUserId(applicationId, userId);
    if (!existing) {
      const err = new Error("Application not found");
      err.statusCode = 404;
      throw err;
    }

    const updated = await repo.updateStatus(applicationId, userId, status);
    const scholarship = await scholarshipRepo.findPublicById(updated.scholarship_id);
    const title = scholarship?.title || "scholarship";
    const statusLabels = {
      submitted: `Submitted application: ${title}`,
      accepted: `Application accepted: ${title}`,
      rejected: `Application not selected: ${title}`,
      pending: `Updated application: ${title}`,
    };
    void activityRepo.record(userId, statusLabels[status] || statusLabels.pending).catch(() => {});

    return res.json({
      id: updated.id,
      userId: updated.user_id,
      scholarshipId: updated.scholarship_id,
      status: updated.status,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
  listMine,
  updateStatus,
};

