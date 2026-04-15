const { getAdminDashboard } = require("../usecases/admin/getAdminDashboard");
const {
  listPendingScholarships,
  listScholarships: listScholarshipsUsecase,
  getScholarshipById,
  verifyScholarship,
  rejectScholarship,
} = require("../usecases/admin/adminScholarships");

async function getDashboard(req, res, next) {
  try {
    const data = await getAdminDashboard();
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

async function getPendingScholarships(req, res, next) {
  try {
    const { search } = req.query;
    const scholarships = await listPendingScholarships({ search });
    return res.json({ scholarships });
  } catch (err) {
    return next(err);
  }
}

async function listScholarships(req, res, next) {
  try {
    const { search, status } = req.query;
    const scholarships = await listScholarshipsUsecase({ search, status });
    return res.json({ scholarships });
  } catch (err) {
    return next(err);
  }
}

async function getScholarship(req, res, next) {
  try {
    const scholarship = await getScholarshipById(req.params.id);
    return res.json({
      id: scholarship.id,
      title: scholarship.title,
      country: scholarship.country,
      degreeLevel: scholarship.degree_level,
      status: scholarship.status,
      deadline: scholarship.deadline,
      fundingType: scholarship.funding_type,
      fieldOfStudy: scholarship.field_of_study,
      amount: scholarship.amount,
      description: scholarship.description,
      applicationUrl: scholarship.application_url,
      rejectionReason: scholarship.rejection_reason,
      createdAt: scholarship.created_at,
      updatedAt: scholarship.updated_at,
      postedBy: scholarship.posted_by_id
        ? {
            id: scholarship.posted_by_id,
            fullName: scholarship.posted_by_full_name,
            email: scholarship.posted_by_email,
          }
        : null,
    });
  } catch (err) {
    return next(err);
  }
}

async function verify(req, res, next) {
  try {
    const updated = await verifyScholarship(req.params.id);
    return res.json({ id: updated.id, status: updated.status });
  } catch (err) {
    return next(err);
  }
}

async function reject(req, res, next) {
  try {
    const { reason } = req.body || {};
    const updated = await rejectScholarship(req.params.id, reason);
    return res.json({
      id: updated.id,
      status: updated.status,
      rejectionReason: updated.rejection_reason,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDashboard,
  listScholarships,
  getPendingScholarships,
  getScholarship,
  verify,
  reject,
};

