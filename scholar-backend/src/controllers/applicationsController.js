const { ApplicationRepository } = require("../repositories/ApplicationRepository");

const repo = new ApplicationRepository();

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_STATUS = new Set(["pending", "submitted", "accepted", "rejected"]);

async function create(req, res, next) {
  try {
    const userId = req.user?.id;
    const scholarshipId = String(req.body?.scholarshipId || "");
    const status = req.body?.status ? String(req.body.status) : "submitted";

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

    const scholarship = await repo.findEligibleScholarshipById(scholarshipId);
    if (!scholarship) {
      const err = new Error("Scholarship not found or not eligible for applications");
      err.statusCode = 404;
      throw err;
    }

    const existing = await repo.findByUserAndScholarship(userId, scholarshipId);
    if (existing) {
      return res.status(409).json({ message: "Application already exists for this scholarship" });
    }

    const created = await repo.create({
      userId,
      scholarshipId,
      status,
    });

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
    const rows = await repo.listByUserId(userId);
    return res.json({
      applications: rows.map((a) => ({
        id: a.id,
        userId: a.user_id,
        scholarshipId: a.scholarship_id,
        status: a.status,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        scholarship: {
          title: a.scholarship_title,
          country: a.scholarship_country,
          deadline: a.scholarship_deadline,
          applicationUrl: a.scholarship_application_url,
        },
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

