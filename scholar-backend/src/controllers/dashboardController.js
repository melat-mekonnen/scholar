const { getDashboardSummary } = require("../usecases/dashboard/getDashboardSummary");

function parseLang(query) {
  const lang = String(query?.lang || "en").toLowerCase();
  return lang === "am" ? "am" : "en";
}

async function getSummary(req, res, next) {
  try {
    const userId = req.user?.id;
    const lang = parseLang(req.query);
    const summary = await getDashboardSummary(userId, lang);
    return res.json(summary);
  } catch (err) {
    return next(err);
  }
}

module.exports = { getSummary };

