const {
  getManagerDashboard,
  getManagerScholarships,
  getManagerScholarshipAnalytics,
  getManagerStatistics,
} = require("../usecases/manager/managerDashboard");

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function dashboard(req, res, next) {
  try {
    const data = await getManagerDashboard(req.user.id);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

async function scholarships(req, res, next) {
  try {
    const rows = await getManagerScholarships(req.user.id);
    return res.json({
      scholarships: rows.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        country: r.country,
        degreeLevel: r.degree_level,
        deadline: r.deadline,
        createdAt: r.created_at,
        applicationsCount: r.applications_count,
        bookmarkCount: r.bookmark_count,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

async function scholarshipAnalytics(req, res, next) {
  try {
    const { id } = req.params;
    if (!id || !UUID_V4.test(id)) {
      const err = new Error("Invalid scholarship id");
      err.statusCode = 400;
      throw err;
    }

    const data = await getManagerScholarshipAnalytics(req.user.id, id);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

async function statistics(req, res, next) {
  try {
    const data = await getManagerStatistics(req.user.id);
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  dashboard,
  scholarships,
  scholarshipAnalytics,
  statistics,
};

