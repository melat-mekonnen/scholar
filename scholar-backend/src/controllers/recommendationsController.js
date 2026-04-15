const { getRecommendations } = require("../usecases/recommendations/getRecommendations");

async function list(req, res, next) {
  try {
    const userId = req.user?.id;
    const topN = req.query?.topN ? Number(req.query.topN) : 10;
    const data = await getRecommendations({ userId, topN });
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { list };

