const { ApplicationRepository } = require("../repositories/ApplicationRepository");

const repo = new ApplicationRepository();

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_STATUS = new Set(["saved", "preparing", "submitted", "accepted", "rejected"]);

function canReadApplication(user, row) {
  if (!user || !row) return false;
  if (user.role === "admin") return true;
  if (user.role === "student") return String(row.user_id) === String(user.id);
  if (user.role === "manager") return String(row.scholarship_posted_by_user_id) === String(user.id);
  return false;
}

async function create(req, res, next) {
  try {
    const userId = req.user?.id;
    const scholarshipId = String(req.body?.scholarshipId || "");
    const status = req.body?.status ? String(req.body.status) : "saved";

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
    const notesByApp = await Promise.all(
      rows.map(async (a) => ({ appId: a.id, notes: await repo.listNotes(a.id) }))
    );
    const notesMap = new Map(notesByApp.map((x) => [x.appId, x.notes]));

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
        notes: (notesMap.get(a.id) || []).map((n) => ({
          id: n.id,
          userId: n.user_id,
          userName: n.user_full_name,
          userEmail: n.user_email,
          note: n.note,
          createdAt: n.created_at,
        })),
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

async function getById(req, res, next) {
  try {
    const applicationId = String(req.params?.id || "");
    if (!UUID_V4.test(applicationId)) {
      const err = new Error("Invalid application id");
      err.statusCode = 400;
      throw err;
    }
    const row = await repo.findById(applicationId);
    if (!row || !canReadApplication(req.user, row)) {
      const err = new Error("Application not found");
      err.statusCode = 404;
      throw err;
    }
    const notes = await repo.listNotes(applicationId);
    return res.json({
      id: row.id,
      userId: row.user_id,
      scholarshipId: row.scholarship_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      scholarship: {
        title: row.scholarship_title,
        country: row.scholarship_country,
        deadline: row.scholarship_deadline,
        applicationUrl: row.scholarship_application_url,
      },
      notes: notes.map((n) => ({
        id: n.id,
        userId: n.user_id,
        userName: n.user_full_name,
        userEmail: n.user_email,
        note: n.note,
        createdAt: n.created_at,
      })),
      timeline: [
        { type: "application_created", at: row.created_at },
        { type: "status_updated", status: row.status, at: row.updated_at },
        ...notes.map((n) => ({ type: "note_added", at: n.created_at, note: n.note })),
      ].sort((a, b) => new Date(a.at) - new Date(b.at)),
    });
  } catch (err) {
    return next(err);
  }
}

async function update(req, res, next) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (role !== "student") {
      const err = new Error("Student access required");
      err.statusCode = 403;
      throw err;
    }
    const applicationId = String(req.params?.id || "");
    if (!UUID_V4.test(applicationId)) {
      const err = new Error("Invalid application id");
      err.statusCode = 400;
      throw err;
    }
    const patch = {};
    if (req.body?.status != null) {
      const status = String(req.body.status);
      if (!ALLOWED_STATUS.has(status)) {
        const err = new Error("Invalid application status");
        err.statusCode = 400;
        throw err;
      }
      patch.status = status;
    }
    const updated = await repo.updateByUser(applicationId, userId, patch);
    if (!updated) {
      const err = new Error("Application not found");
      err.statusCode = 404;
      throw err;
    }
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

async function remove(req, res, next) {
  try {
    const userId = req.user?.id;
    const role = req.user?.role;
    if (role !== "student") {
      const err = new Error("Student access required");
      err.statusCode = 403;
      throw err;
    }
    const applicationId = String(req.params?.id || "");
    if (!UUID_V4.test(applicationId)) {
      const err = new Error("Invalid application id");
      err.statusCode = 400;
      throw err;
    }
    const deleted = await repo.deleteByUser(applicationId, userId);
    if (!deleted) {
      const err = new Error("Application not found");
      err.statusCode = 404;
      throw err;
    }
    return res.status(204).send();
  } catch (err) {
    return next(err);
  }
}

async function addNote(req, res, next) {
  try {
    const role = req.user?.role;
    if (role !== "student") {
      const err = new Error("Student access required");
      err.statusCode = 403;
      throw err;
    }
    const userId = req.user?.id;
    const applicationId = String(req.params?.id || "");
    const note = String(req.body?.note || "").trim();
    if (!UUID_V4.test(applicationId)) {
      const err = new Error("Invalid application id");
      err.statusCode = 400;
      throw err;
    }
    if (!note) {
      const err = new Error("Note is required");
      err.statusCode = 400;
      throw err;
    }
    const existing = await repo.findByIdAndUserId(applicationId, userId);
    if (!existing) {
      const err = new Error("Application not found");
      err.statusCode = 404;
      throw err;
    }
    const created = await repo.addNote({ applicationId, userId, note });
    return res.status(201).json({
      id: created.id,
      applicationId: created.application_id,
      userId: created.user_id,
      note: created.note,
      createdAt: created.created_at,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
  listMine,
  updateStatus,
  getById,
  update,
  remove,
  addNote,
};

