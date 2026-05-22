const { getRecommendations } = require("../usecases/recommendations/getRecommendations");

function parseLang(query) {
  const lang = String(query?.lang || "en").toLowerCase();
  return lang === "am" ? "am" : "en";
}

async function list(req, res, next) {
  try {
    const userId = req.user?.id;
    const topN = req.query?.topN ? Number(req.query.topN) : 10;
    const lang = parseLang(req.query);
    const data = await getRecommendations({ userId, topN, lang });
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { list };

