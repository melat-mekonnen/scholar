const { getDashboardSummary } = require("../usecases/dashboard/getDashboardSummary");

async function getSummary(req, res, next) {
  try {
    const userId = req.user?.id;
    const summary = await getDashboardSummary(userId);
    return res.json(summary);
  } catch (err) {
    return next(err);
  }
}

module.exports = { getSummary };

