const { discoverScholarships } = require("../usecases/recommendations/discoverScholarships");

async function refresh(req, res, next) {
  try {
    const userId = req.user?.id;
    const topN = req.body?.topN ? Number(req.body.topN) : 20;
    const data = await discoverScholarships({ userId, topN });
    return res.json(data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { refresh };

